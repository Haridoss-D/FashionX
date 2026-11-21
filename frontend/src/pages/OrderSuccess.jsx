import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "../api.js";

export default function OrderSuccess() {
  const { orderNumber } = useParams();
  const { state } = useLocation();
  const paidOnline = state?.method === "ONLINE";

  return (
    <div className="container empty-page">
      <CheckCircle2 size={56} color="#2f9e63" />
      <h1>{paidOnline ? "Payment successful" : "Order placed"}</h1>
      <p>
        Your order number is <strong>{orderNumber}</strong>.
        {paidOnline && state?.total && <> We received {formatPrice(state.total)}.</>}
        {!paidOnline && state?.total && <> Please keep {formatPrice(state.total)} ready to pay on delivery.</>}
      </p>
      <p className="muted">We will contact you on your mobile number to confirm shipping.</p>
      <Link to="/products" className="btn btn-dark">Continue shopping</Link>
    </div>
  );
}
