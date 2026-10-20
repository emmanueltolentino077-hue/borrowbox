-- ====================================================================
-- BORROWBOX: PHASE 5 ATOMIC RETURN BORROW PROCEDURE
-- ====================================================================

CREATE OR REPLACE FUNCTION public.return_borrow(
    p_borrow_id UUID,
    p_returned_by UUID
) RETURNS JSONB AS $$
DECLARE
    v_borrow RECORD;
    v_item RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Check if borrow exists and lock row
    SELECT * INTO v_borrow
    FROM public.borrows
    WHERE id = p_borrow_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status', 404, 'message', 'Borrow record not found.');
    END IF;

    -- 2. Concurrency protection: already returned check (Q27)
    IF v_borrow.returned_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'status', 409, 'message', 'Already returned.');
    END IF;

    -- 3. Mark borrow as returned
    UPDATE public.borrows
    SET returned_at = v_now,
        returned_by = p_returned_by
    WHERE id = p_borrow_id;

    -- 4. Restore available units for each equipment item
    FOR v_item IN
        SELECT equipment_id, quantity
        FROM public.borrow_items
        WHERE borrow_id = p_borrow_id
    LOOP
        UPDATE public.equipment
        SET available_units = available_units + v_item.quantity
        WHERE id = v_item.equipment_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'status', 200,
        'borrow_id', p_borrow_id,
        'returned_at', v_now,
        'message', 'Borrow successfully marked as returned.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
