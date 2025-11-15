E-Commerce API

A simple and production-ready Node.js + Express E-Commerce Backend featuring authentication, product management, cart, orders, payments, stock reservation, auto-cancel, and admin controls.

******************Features**************************
1.JWT Authentication (Register / Login)
2.Role-based Access (USER / ADMIN)
3.Product CRUD (Admin only)
4.Cart Management (Add / Update / Remove items)
5.Order Checkout → Payment Workflow
6.Automatic Stock Reservation
7.Auto-Cancel Unpaid Orders (15 min default)
8.MongoDB Transactions with fallback for standalone MongoDB
9.Pagination, Sorting & Filtering
10.Includes Postman Collection  - Ecommerce API Full Collection 

*********************Tech Stack***********************
1.Node.js, Express.js
2.MongoDB, Mongoose
3.JWT Authentication
4.Joi Validation

********************Environment Variable**************
.env file
PORT=5000
MONGO_URI=mongodb://localhost:27017/ecommerce_db
JWT_SECRET=your_secret_key
ORDER_PAYMENT_TIMEOUT_MINUTES=15  

******************Installation & Running**************
npm install
npm run dev  or npm start  ( Better to use npm run dev because I have used nodemon)

After "npm run dev"    will show "Connected to MongoDB"
"Server started on port 5000"   Now you are ready to use api and test in postman.

*******************API Endpoints***********************

Auth

POST /auth/register
POST /auth/login

Products (Admin)

POST /products
PUT /products/:id
DELETE /products/:id
GET /products (Public)

Cart

GET /cart
POST /cart/items
DELETE /cart/items/:productid

Orders

POST /orders/checkout
POST /orders/:id/pay
GET /orders
GET /orders/:id

Admin Orders

GET /admin/orders
PATCH /admin/orders/:id/status

********************Order Flow********************

1.	Add products to cart
2. Checkout - Order created (PENDING_PAYMENT)
3. Stock reserved (available - reserved)
4. Pay - Order becomes PAID
5. If not paid - Auto-cancel after timeout

