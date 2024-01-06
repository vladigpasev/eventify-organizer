"use client"
import React, { useEffect, useState } from 'react';
import { checkAuthenticated, loginUser } from '@/server/auth'; // Modify the path as per your project structure
import { useRouter } from 'next/navigation';


function Login() {
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const isAuthenticated = await checkAuthenticated();
                if (isAuthenticated) {
                    router.push('/dashboard'); // Redirect to dashboard or desired page if already logged in
                }
            } catch (error) {
                console.error('Authentication check failed:', error);
            }
        };

        checkAuth();
    }, []);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        if (name === 'email') {
            setEmail(value);
        } else if (name === 'password') {
            setPassword(value);
        }
        setError(''); // Clear error when user starts typing
    };

    const validateEmail = (email: any) => {
        // Regular expression to validate email
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please fill out all fields.');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        try {
            setLoading(true);
            const result = await loginUser({ email, password });
            if (result.success) {
                console.log('Login successful', result.message);
                router.push('/dashboard'); // Redirect to dashboard or desired page
            } else {
                setError(result.message);
                console.log('Login failed', result.message);
            }
        } catch (error) {
            setError('An unexpected error occurred. Please try again later.');
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <section className="bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
                    <a href="#" className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
                        <img className="h-8 mr-2" src="/logo.png" alt="logo" />
                    </a>
                    <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
                        <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                                Sign in to your account
                            </h1>
                            {error && <p className="text-error">{error}</p>}
                            <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Email</label>
                                    <input type="email" name="email" id="email" value={email} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
                                    <input type="password" name="password" id="password" value={password} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
                                </div>
                                <button type="submit" className={`w-full text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center ${loading ? 'bg-gray-400' : 'bg-primary-600'}`} disabled={loading}>
                                    {loading ? 'Loading...' : 'Sign In'}
                                </button>
                                <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                                    Don&apos;t have an account? <a href="/auth/register" className="font-medium text-primary-600 hover:underline dark:text-primary-500">Register here</a>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Login;
