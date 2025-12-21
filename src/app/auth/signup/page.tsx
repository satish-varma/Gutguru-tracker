'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUp() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Signup failed');
                setIsLoading(false);
            } else {
                // Automatically sign in after signup?? Or redirect to login.
                router.push('/auth/signin');
            }
        } catch (error) {
            setError('Something went wrong');
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Sign Up</h1>
                <p>Create your private account</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <p className="footer-text">
                    Already have an account? <a href="/auth/signin">Sign In</a>
                </p>
            </div>

            {/* Reuse styles from SignIn */}
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
