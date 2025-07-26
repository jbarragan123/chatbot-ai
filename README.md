# 🧠 Wizybot Technical Assessment - Fullstack Developer

This repository contains the solution to the technical assessment for the Fullstack Developer position at **Wizybot**. The project implements a NestJS-based API endpoint that allows communication with an AI chatbot capable of using two tools:

- `searchProducts(query: string)`
- `convertCurrencies(amount: number, fromCurrency: string, toCurrency: string)`

The chatbot is powered by the **OpenAI Chat Completion API** using **Function Calling**.

---

## 🚀 How to Run the Project

### 🧰 Prerequisites

- [Node.js (>= 18.x)](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [OpenAI API Key](https://platform.openai.com/account/api-keys)
- [Open Exchange Rates API Key](https://openexchangerates.org/signup)

---

### 🛠️ Installation

1. **Clone the repository**

```bash
git clone https://github.com/jbarragan123/chatbot-ai
cd chatbot-ai
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment variables**

Create a `.env` file in the root directory and add the following:

```env
OPENAI_API_KEY=key_here
EXCHANGE_RATES_API_KEY=key_here
```

Note: Copy and paste the keys sent into the attached email.

4. **Run the project in development**

```bash
npm run start:dev
```

---

## 🧪 Testing the API

A **Postman** collection for testing API called chatbot-ai.postman_collection was included in the root of this project, you can also use **swagger**

### Endpoint

```
POST /chat
```

### Request Body

```json
{
  "query": "I am looking for a phone"
}
```

### Example Queries

You can test the following queries (as suggested in the assessment):

- `"I am looking for a phone"`
- `"I am looking for a present for my dad"`
- `"How much does a watch costs?"`
- `"What is the price of the watch in Euros"`
- `"How many Canadian Dollars are 350 Euros"`

---

## 📂 Project Structure

```bash
src/
│
├── chat/                   # Chatbot logic and controller
│   ├── chat.controller.ts  # Handles incoming POST request
│   ├── chat.service.ts     # Orchestrates OpenAI calls
│   ├── dto/                # DTOs for input validation
│
├── openai/                 # Service to interact with OpenAI Chat API
│   └── openai.service.ts
│
├── tools/                  # Functions exposed to the LLM
│   ├── product.service.ts  # Implements searchProducts()
│   └── currency.service.ts # Implements convertCurrencies()
│
├── data/                   # Contains the Full Stack Test products_list.csv
│
├── main.ts                 # Entry point
└── app.module.ts
```

---

## 🧾 Functionality

### ✅ searchProducts()

- Returns **2 relevant products** based on a user query.
- Reads from `Full Stack Test products_list.csv`.
- Uses fuzzy matching to extract keywords and compare with product titles/descriptions.

### ✅ convertCurrencies()

- Uses [Open Exchange Rates API](https://openexchangerates.org/) to convert an amount from one currency to another.
- Validates input and formats currency properly.

---

## 📘 Swagger API Documentation

Once the server is running, Swagger documentation is available at:

```
http://localhost:3000/api-docs

```

This includes:

- POST `/chat` request schema
- Example input/output
- Function descriptions

---

## ✅ Requirements Checklist

- [x] Built with NestJS and TypeScript
- [x] Uses OpenAI **Chat Completion API** with Function Calling
- [x] Implements `searchProducts()` using `Full Stack Test products_list.csv`
- [x] Implements `convertCurrencies()` with live exchange rates
- [x] Endpoint tested with real queries
- [x] Clean code with English comments and good structure
- [x] Swagger UI auto-generated documentation
- [x] README with clear install and usage instructions

---

## 🧑‍💻 Author

**Juan Barragán**  
[GitHub Profile](https://github.com/jbarragan123)


> If you have any questions or need an extension, please contact me orionmaster8@gmail.com.
