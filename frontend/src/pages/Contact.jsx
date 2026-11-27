import { Link } from "react-router-dom";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import EnquiryForm from "../components/EnquiryForm.jsx";
import { CARE_LABEL, SUPPORT } from "../siteConfig.js";

const BASE = [
  { name: "name", label: "Your name", required: true },
  { name: "phone", label: "Mobile number", type: "tel", required: true, placeholder: "10-digit number" },
];

export function Seller() {
  return (
    <div className="container info-page">
      <h1>Become a Seller</h1>
      <p className="muted">
        Want to sell your clothing and fashion products on FashionX? Tell us about your business and our team will
        contact you.
      </p>
      <EnquiryForm
        kind="SELLER"
        submitLabel="Send application"
        successText="We have received your details and will contact you on your mobile number soon."
        fields={[
          ...BASE,
          { name: "business", label: "Business or brand name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "message", label: "What do you want to sell?", required: true, textarea: true, placeholder: "Products, price range, how many items you have" },
        ]}
      />
    </div>
  );
}

export function Advertise() {
  return (
    <div className="container info-page">
      <h1>Advertise on FashionX</h1>
      <p className="muted">Want to reach our shoppers? Send us your details and what you would like to promote.</p>
      <EnquiryForm
        kind="ADVERTISE"
        submitLabel="Send enquiry"
        successText="Thanks for your interest. We will get back to you on your mobile number or email."
        fields={[
          ...BASE,
          { name: "business", label: "Business or brand name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "message", label: "What would you like to advertise?", required: true, textarea: true },
        ]}
      />
    </div>
  );
}

export function Support() {
  const { phone, whatsapp, email, hours } = SUPPORT;
  return (
    <div className="container info-page">
      <h1>{CARE_LABEL}</h1>
      <p className="muted">Need help with an order, a return or a product? Reach us any of these ways.</p>

      <div className="panel contact-list">
        {phone && <p><Phone size={18} /> <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></p>}
        {whatsapp && <p><MessageCircle size={18} /> <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Chat on WhatsApp</a></p>}
        {email && <p><Mail size={18} /> <a href={`mailto:${email}`}>{email}</a></p>}
        {hours && <p><Clock size={18} /> {hours}</p>}
        {!phone && !whatsapp && !email && <p className="muted">Send us a message below and we will call you back.</p>}
      </div>

      <p>
        Looking for your order? <Link to="/track" className="underline">Track it here</Link>. You can cancel within 24
        hours of ordering, until it ships.
      </p>

      <h2>Send us a message</h2>
      <EnquiryForm
        kind="SUPPORT"
        submitLabel="Send message"
        successText="We have your message and will reply on your mobile number as soon as we can."
        fields={[
          ...BASE,
          { name: "email", label: "Email", type: "email" },
          { name: "order_number", label: "Order number", placeholder: "ORD12001" },
          { name: "message", label: "How can we help?", required: true, textarea: true },
        ]}
      />
    </div>
  );
}
