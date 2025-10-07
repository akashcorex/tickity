# Ticketr - Real-time Event Ticketing Platform

Ticketr is a modern, real-time event ticketing platform built with Next.js, Convex, Clerk, and Razorpay. It features a sophisticated queue system, real-time updates, secure payment processing, and a beautiful, responsive UI.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Setup Guides](#setup-guides)
- [Architecture](#architecture)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### For Event Attendees
- 🎫 Real-time ticket availability tracking  
- ⚡ Smart queuing system with position updates  
- 🕒 Time-limited ticket offers  
- 📱 Mobile-friendly ticket management  
- 🔒 Secure payment processing with Razorpay  
- 📲 Digital tickets with QR codes  
- 💸 Automatic refunds for cancelled events  

### For Event Organizers
- 💰 Direct payments via Razorpay  
- 📊 Real-time sales monitoring  
- 🎯 Automated queue management  
- 📈 Event analytics and tracking  
- 🔄 Automatic ticket recycling  
- 🎟️ Customizable ticket limits  
- ❌ Event cancellation with automatic refunds  
- 🔄 Bulk refund processing  

---

## Technical Features
- 🚀 Real-time updates using Convex  
- 👤 Authentication with Clerk  
- 💳 Payment processing with Razorpay  
- 🌐 Server-side and client-side rendering  
- 🎨 Modern UI with Tailwind CSS and shadcn/ui  
- 📱 Responsive design  
- 🛡️ Rate limiting for queue joins and purchases  
- 🔒 Automated fraud prevention  
- 🔔 Toast notifications for real-time feedback  
- ✨ Beautiful, accessible components with shadcn/ui  

---

## UI/UX Features
- 🎯 Instant feedback with toast notifications  
- 🎨 Consistent design system using shadcn/ui  
- ♿ Fully accessible components  
- 🎭 Animated transitions and feedback  
- 📱 Responsive design across all devices  
- 🔄 Loading states and animations  
- 💫 Micro-interactions for better engagement  

---

## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui  
- **Backend:** Convex  
- **Authentication:** Clerk  
- **Payments:** Razorpay  

---

## Getting Started

### Prerequisites
- Node.js 18+  
- npm or yarn  
- Razorpay Account  
- Clerk Account  
- Convex Account  

---

### Environment Variables

Create a `.env.local` file in the root directory and add the following:

```env
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
````

---

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ticketr

# Install dependencies
npm install

# Start the development server
npm run dev

# In a separate terminal, start Convex
npx convex dev
```

---

### Setup Guides

#### Clerk

1. Create a Clerk application
2. Configure authentication providers and redirect URLs
3. Add your Clerk keys to `.env.local`

#### Convex

1. Create a Convex account
2. Create a new project
3. Install Convex CLI: `npm install convex`
4. Initialize Convex: `npx convex init`
5. Add your deployment URL to `.env.local`
6. Start Convex dev server: `npx convex dev`

#### Razorpay

1. Create a Razorpay account
2. Generate API keys
3. Add keys to `.env.local`
4. Implement Razorpay checkout flow in your frontend
5. Implement server-side verification and webhook handling

---

### UI Components

```bash
# Install shadcn/ui CLI
npx shadcn-ui@latest init

# Add components
npx shadcn-ui@latest add toast button card dialog

# Add toaster
npx shadcn-ui@latest add toaster
```

---

## Architecture

* **Database Schema:** Events, Tickets, Waiting List, Users
* **Key Components:** Real-time queue management, rate limiting, automated offer expiration, payment processing, user synchronization

---

## Usage

### Creating an Event

1. Sign up as an event organizer
2. Complete Razorpay onboarding
3. Create event with details and ticket quantity
4. Publish event

### Purchasing Tickets

1. Browse available events
2. Join queue for desired event
3. Receive ticket offer
4. Complete purchase within time limit
5. Access digital ticket with QR code

### Handling Refunds and Cancellations

* Event organizers can cancel events from their dashboard
* System automatically processes refunds for all ticket holders
* Refund status can be tracked in the user dashboard

---

### User Experience

* **Real-time Feedback:** Instant purchase confirmations, queue position updates, error notifications, success page, ticket status
* **Interactive Elements:** Animated buttons and cards, loading states, progress indicators, skeleton loaders, smooth transitions

---

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

---

## License

This project is licensed under the MIT License.

