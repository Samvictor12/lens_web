import { useNavigate } from "react-router-dom";
import SaleOrderForm from "@/components/forms/SaleOrderForm";

export default function CreateSaleOrder() {
    const navigate = useNavigate();

    const handleCreateOrder = (orderData) => {
        // Here you would typically send the data to your API
        console.log("Creating order:", orderData);

        // For now, just show a success message and navigate back
        alert("Sale order created successfully!");
        navigate("/sales/orders");

        // In a real app, you would:
        // 1. Send POST request to your API
        // 2. Handle success/error responses
        // 3. Show proper notifications
        // 4. Redirect appropriately
    };

    const handleCancel = () => {
        navigate("/sales/orders");
    };

    return (
        <div className="min-h-full bg-gray-50">
            <SaleOrderForm
                onSubmit={handleCreateOrder}
                onCancel={handleCancel}
            />
        </div>
    );
}