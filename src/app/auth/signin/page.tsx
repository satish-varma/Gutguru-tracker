'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Invalid credentials');
                setIsLoading(false);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (error) {
            setError('Something went wrong');
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Sign In</h1>
                <p>HungerBox Invoice Tracker</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <p className="footer-text">
                    Don't have an account? <a href="/auth/signup">Sign Up</a>
                </p>
            </div>

            <style jsx>{`
        .auth-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
        }
        .auth-card {
          background: white;
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 400px;
        }
        h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; text-align: center; }
        p { color: #64748b; text-align: center; margin-bottom: 2rem; }
        .form-group { margin-bottom: 1rem; }
        label { display: block; font-size: 0.875rem; margin-bottom: 0.5rem; font-weight: 500; }
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 1rem;
        }
        .btn { width: 100%; padding: 0.75rem; margin-top: 1rem; }
        .error-msg {
          background: #fee2e2;
          color: #ef4444;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          text-align: center;
        }
        .footer-text { margin-top: 1.5rem; font-size: 0.875rem; }
      `}</style>
        </div>
    );
}
