-- ====================================================================
-- BORROWBOX: PHASE 4 ATOMIC ISSUE BORROW PROCEDURE
-- ====================================================================

CREATE OR REPLACE FUNCTION public.issue_borrow(
    p_borrower_id UUID,
    p_issued_by UUID,
    p_due_at TIMESTAMPTZ,
    p_items JSONB -- Array of { "equipment_id": "uuid", "quantity": int }
) RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_equipment_id UUID;
    v_quantity INT;
    v_current_avail INT;
    v_item_name TEXT;
    v_borrow_id UUID;
    v_loan_code TEXT;
BEGIN
    -- 1. Verify borrower exists
    IF NOT EXISTS (SELECT 1 FROM public.borrowers WHERE id = p_borrower_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Borrower not found.');
    END IF;

    -- 2. Sort and validate stock for each item in fixed order (prevents deadlocks)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) ORDER BY (value->>'equipment_id')
    LOOP
        v_equipment_id := (v_item->>'equipment_id')::UUID;
        v_quantity := (v_item->>'quantity')::INT;

        IF v_quantity <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be a positive integer.');
        END IF;

        -- Check equipment availability and lock row
        SELECT name, available_units INTO v_item_name, v_current_avail
        FROM public.equipment
        WHERE id = v_equipment_id AND is_archived = false
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Equipment item not found or is archived.'
            );
        END IF;

        -- Stock conflict check (Q19, Q20)
        IF v_current_avail < v_quantity THEN
            RETURN jsonb_build_object(
                'success', false,
                'short_item', v_item_name,
                'available', v_current_avail,
                'requested', v_quantity,
                'message', format('Not enough stock for %s. Available: %s, requested: %s. Refresh and review your tray.', v_item_name, v_current_avail, v_quantity)
            );
        END IF;

        -- Deduct stock
        UPDATE public.equipment
        SET available_units = available_units - v_quantity
        WHERE id = v_equipment_id;
    END LOOP;

    -- 3. Generate loan_code (e.g. BB-2026-94812)
    v_loan_code := 'BB-' || to_char(NOW(), 'YYYY') || '-' || lpad((floor(random() * 90000) + 10000)::text, 5, '0');

    -- 4. Insert into borrows
    INSERT INTO public.borrows (loan_code, borrower_id, issued_by, issued_at, due_at)
    VALUES (v_loan_code, p_borrower_id, p_issued_by, NOW(), p_due_at)
    RETURNING id INTO v_borrow_id;

    -- 5. Insert into borrow_items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.borrow_items (borrow_id, equipment_id, quantity)
        VALUES (v_borrow_id, (v_item->>'equipment_id')::UUID, (v_item->>'quantity')::INT);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'borrow_id', v_borrow_id,
        'loan_code', v_loan_code,
        'due_at', p_due_at,
        'message', 'Equipment borrow issued successfully.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
