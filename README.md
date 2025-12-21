# HungerBox Invoice Tracker

This application automates the tracking of payment advice invoices from Hungerbox emails.

## Setup

1.  **Duplicate the environment file**:
    ```bash
    cp .env.example .env.local
    ```
2.  **Add your credentials** in `.env.local`:
    -   `EMAIL_USER`: Your email address.
    -   `EMAIL_PASSWORD`: Your App Password (not your login password).
        -   For Gmail: Go to Account > Security > 2-Step Verification > App Passwords.

## Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Features

-   **Dashboard**: View total revenue, top locations, and active stalls.
-   **Sync**: Click "Sync Invoices" to fetch latest emails from Hungerbox.
-   **Analytics**: Automatic breakdown by Location and Stall.
