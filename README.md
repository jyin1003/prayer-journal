# Pocket Prayer

## Getting Started
1. Activate virtual environment
    ```
    # WINDOWS
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1

    # LINUX
    python -m venv .venv
    source .venv/bin/activate
    ```

2. Install dependencies
    ```
    npm init -y
    npm install
    ```

3. Start the app
    ```
    npm run dev
    ```

## Setup Stack
**Backend**
1. Create a Supabase project
2. Paste your Supabase URL and public API key into the `.env.local` file
3. Run `supabase/schema.sql` in the Supabase project's SQL editor

 **Deployment**
 1. Add this codebase to a GitHub repository
 2. Link this repository when creating a Vercel project
 3. Add your keys from the `.env.local` file to the Vercel project's environment variables
 4. Deploy

 ## To Do
- faster response after ticking
- fix dark logo
- cleanup daily selections