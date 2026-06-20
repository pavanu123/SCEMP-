Loopcart ♻️

Loopcart is a marketplace web app that connects buyers, sellers, and recyclers — sellers list items for sale or recycling, buyers shop and bid, and recyclers pick up items via a bidding/pickup workflow. The project includes a carbon-footprint calculator and a sustainability-focused "recycle hub" alongside a standard e-commerce flow.


Built with Node.js, Express, MongoDB (Mongoose), and a static HTML/CSS/JS frontend served from public/.




✨ Features


Auth — register/login as buyer, seller, or recycler with JWT-based sessions
Product listings — sellers create listings with images (Cloudinary-hosted), price, category, condition, and quantity
Bidding — recyclers/buyers can bid on listings; sellers accept bids and schedule pickups
Cart & checkout — standard add-to-cart and checkout flow for buyers
Wishlist — save products for later
Chat — buyer/seller messaging tied to a listing
Proof of pickup — upload and verify pickup/recycling proof
Carbon calculator — estimate environmental impact of recycling vs. disposal
Seller dashboard — manage listings, view stats


🗂 Project structure

SCEMP-/
├── server.js              # App entry point — see ⚠️ Architecture note below
├── Controllers/
│   └── Auth.js             # Register/login controller logic
├── middleware/
│   └── auth.js             # JWT auth + role-based guards (admin/seller/buyer)
├── models/                 # Mongoose schemas: User, Product, Bid, Listing, Seller, Chat, Message, Proof
├── routes/                 # Express routers: auth, products, bids, cart, chat, listing, proof, sellers, wishlist
├── views/                  # EJS templates (about, index, footer partial)
├── public/                 # Static frontend — HTML pages, css/, js/, images/
└── package.json

⚠️ Architecture note (read before extending this project)

server.js does not currently import anything from routes/, Controllers/, middleware/, or models/. It defines its own copies of the User, Product, and Bid schemas inline and only exposes a small set of endpoints directly (POST /api/products, GET /api/cloudinary/config, GET /api/health, plus the static page routes).

The full route layer in routes/ (auth, bids, cart, chat, listing, proof, sellers, wishlist) and Controllers/Auth.js are written but not wired into the running app — they're dead code until someone adds the corresponding app.use('/api/...', require('./routes/...')) lines in server.js. If a feature seems to be missing at runtime (e.g. login, cart, wishlist), this is why — the route file exists, but server.js never mounts it.

Before adding new features, the recommended fix is to refactor server.js to require and mount the existing routes/ files, and delete the duplicated inline schemas/handlers in favor of the models/ and routes/ versions.

🔧 Prerequisites


Node.js v18 or later
A MongoDB Atlas connection string (or local MongoDB instance)
A Cloudinary account (for image uploads)


🚀 Getting started

bashgit clone https://github.com/pavanu123/SCEMP-.git
cd SCEMP-
npm install

Environment variables

Create a .env file in the project root:

envMONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000


🔐 Security warning: the current server.js has a live MongoDB Atlas URI and Cloudinary API key/secret hardcoded as fallback values directly in the source file. Since this is a public repository, treat those credentials as already compromised — rotate/regenerate them in MongoDB Atlas and Cloudinary, then remove the hardcoded fallbacks from server.js so the app relies solely on .env.



Run the app

bashnpm run dev    # nodemon — auto-restarts on file changes
# or
npm start      # plain node

The server starts on http://localhost:5000 (or your PORT). Key URLs:

URLDescription/Homepage/login, /signupAuth pages/shopBuyer shop view/buyer, /sellerRole dashboards/recycle, /redashboardRecycler hub/carbonCarbon footprint calculator/cart, /checkoutCart & checkout/api/healthHealth check (DB + Cloudinary status)

📡 API overview (as written in routes/)


Note: per the architecture warning above, these are only live once server.js mounts the corresponding router.




routes/auth.js — POST /register, POST /login, GET /me
routes/products.js — CRUD for listings, plus GET /recycle and GET /seller/:sellerId
routes/bids.js — place/view bids, accept bid, schedule pickup, recycler stats
routes/cart.js — get/add/update/remove cart items
routes/wishlist.js — get/add/remove/check wishlist items
routes/chat.js — conversations and messages between buyer/seller
routes/sellers.js — seller profile, stats, document upload
routes/proof.js — upload/verify/reject pickup proof


🧰 Tech stack

LayerTechBackendNode.js, ExpressDatabaseMongoDB + MongooseAuthJWT (jsonwebtoken), bcryptjsFile uploadsMulter + CloudinaryFrontendStatic HTML/CSS/JS (+ a couple of EJS views)

🤝 Contributing

Issues and pull requests are welcome. If you pick up the routing refactor mentioned above, please open a PR — it's the highest-value cleanup for this codebase right now.

📄 License

No license file is currently included in this repository — all rights reserved by default unless the author adds one.
