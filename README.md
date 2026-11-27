# FashionX: E-commerce (React + Django)

```
fashionx/
├── backend/    Django REST API  -> deploy on Render
├── frontend/   React (Vite)     -> deploy on Netlify
└── render.yaml Render blueprint (backend + database)
```

## Run locally

### 1. Backend (Terminal 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # Windows: copy .env.example .env
python manage.py makemigrations store
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_products
python manage.py runserver
```
Check: http://localhost:8000/api/products/ and http://localhost:8000/admin/

### 2. Frontend (Terminal 2)
```bash
cd frontend
npm install
cp .env.example .env              # Windows: copy .env.example .env
npm run dev
```
Open http://localhost:5173

## Shopping features
Product pages (`/product/<name>`) with description, reviews, similar products, delivery date, return policy,
Buy Now, share link and wishlist. Search in the top menu. Order tracking at `/track`, and customers can cancel
within 24 hours until the order ships. Reviews are allowed only after an order is delivered; hide a review in the
Django admin (`/admin/` on the backend) by unticking "Is visible". Change delivery speed in `backend/store/delivery.py`.
After copying these files run `python manage.py makemigrations store` and `python manage.py migrate`,
then commit the new file in `backend/store/migrations/`.

## Colours, sizes and prices; details; More menu
In `/admin > Products`, tick "Different colours or sizes have different prices" and add one row per colour and size
(price, stock, photo). Add Product highlights, Features, Specifications and Manufacturer info in the same form.
The More menu has Become a Seller, Notification Settings, Customer Care and Advertise. The three forms land in
`/admin > Enquiries`. Put your phone, WhatsApp and email in `frontend/src/siteConfig.js`.
Run `python manage.py makemigrations store` and `migrate` after copying these files.

## Online payment (Razorpay test mode)
1. Dashboard > Account & Settings > API Keys > Generate Test Key.
2. Put the two keys in `backend/.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then restart the backend.
3. Test payment: card `4111 1111 1111 1111`, any future expiry, any CVV, any name. For UPI use `success@razorpay`.

Release stock held by unpaid online orders (run now and then, or schedule it later):
```bash
python manage.py release_unpaid_orders --minutes 30
```

## Google Sheets export
Every Cash on Delivery order, and every online order once paid, is copied to your sheet
("Orders" tab: one row per order; "Customers" tab: one row per mobile number).
1. Google Cloud Console: create a project, enable **Google Sheets API**.
2. IAM & Admin > Service Accounts > Create. Open it > Keys > Add key > JSON. Save the file as
   `backend/google-service-account.json`.
3. Create a Google Sheet, copy its ID from the address bar (between `/d/` and `/edit`), and share
   the sheet with the service account email (`client_email` in the JSON file) as **Editor**.
4. In `backend/.env`: `GOOGLE_SHEET_ID=...` and `GOOGLE_SERVICE_ACCOUNT_FILE=google-service-account.json`.
5. `pip install -r requirements.txt`, restart the backend.
Copy older orders or retry failures: `python manage.py sync_sheets` (add `--all` to re-copy everything).
On Render, paste the whole JSON file contents into the `GOOGLE_SERVICE_ACCOUNT_JSON` variable.

## Deploy
1. Push this folder to a GitHub repository.
2. **Render**: New > Blueprint > pick the repo. It reads `render.yaml`.
   After the first deploy, open the service Shell and run `python manage.py createsuperuser`.
3. **Netlify**: New site from Git > base directory `frontend`.
   Add the environment variable `VITE_API_URL = https://YOUR-BACKEND.onrender.com/api`.
4. In Render, set `CORS_ALLOWED_ORIGINS` to your Netlify URL and redeploy.
