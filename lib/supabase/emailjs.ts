
import "server-only";

const serviceId = process.env.EMAILJS_SERVICE_ID;
const templateId = process.env.EMAILJS_TEMPLATE_ID;
const publicKey = process.env.EMAILJS_PUBLIC_KEY;
const privateKey = process.env.EMAILJS_PRIVATE_KEY;

type ActivationEmailParams = {
    to_email: string;
    to_name: string;
    employee_id: string;
    activation_link: string;
};

export async function sendActivationEmail(
    params: ActivationEmailParams
): Promise<void> {
    if (!serviceId || !templateId || !publicKey || !privateKey) {
        throw new Error("EmailJS server configuration is incomplete.");
    }

    const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                accessToken: privateKey,
                template_params: params,
            }),
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error("EmailJS send failed:", response.status, errorText);

        throw new Error("Unable to send the activation email.");
    }
}
