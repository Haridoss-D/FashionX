import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "../api.js";
import { fmtDay } from "../utils.js";

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
      {state?.delivery && <p><strong>Deliver by {fmtDay(state.delivery)}</strong></p>}
      <p className="muted">
        You can cancel this order within 24 hours, until it ships. Use the mobile number you gave at checkout.
      </p>
      <div className="btn-row">
        <Link to={`/track?order=${orderNumber}`} className="btn btn-gold">Track order</Link>
        <Link to="/products" className="btn btn-dark">Continue shopping</Link>
      </div>
    </div>
  );
}
