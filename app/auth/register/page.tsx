"use client";
import React, { useState } from 'react';
import { registerUser } from '@/server/auth';
import { useRouter } from 'next/navigation';

function Register() {
    // State for the registration form
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        company: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // State for password requirements
    const [passwordLength, setPasswordLength] = useState(false);
    const [uppercase, setUppercase] = useState(false);
    const [lowercase, setLowercase] = useState(false);
    const [number, setNumber] = useState(false);
    const [symbol, setSymbol] = useState(false);
    const [loading, setLoading] = useState(false); // New state for loading indication
    const router = useRouter();

    const goToPreviousStep = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    // Handle input change and validate password in real-time
    //@ts-ignore
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError(''); // Clear error when user starts typing

        // Password validation logic
        if (name === 'password') {
            setPasswordLength(value.length >= 12);
            setUppercase(/[A-Z]/.test(value));
            setLowercase(/[a-z]/.test(value));
            setNumber(/\d/.test(value));
            setSymbol(/[!@#$%^&*(),.?":{}|<>]/.test(value));
        }
    };

    // Navigate to the next step of the registration
    const goToNextStep = (e: any) => {
        e.preventDefault();
        if (step === 1 && (!formData.firstname || !formData.lastname || !formData.company)) {
            setError('Please fill out all fields before proceeding.');
            return;
        }
        setStep(2);
    };

    const validateEmail = (email: any) => {
        // Regular expression to validate email
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    // Handle the submission of the registration form
    //@ts-ignore
    //@ts-ignore
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check if all fields are filled
        if (Object.values(formData).some(field => field === '')) {
            setError('Please fill out all fields.');
            return;
        }
        // Check if the email is valid
        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address.');
            return;
        }
        // Check if the password meets all requirements
        if (!passwordLength || !uppercase || !lowercase || !number || !symbol) {
            setError('Please make sure your password meets all the requirements.');
            return;
        }

        // Check if passwords match
        if (formData.password !== formData.confirmPassword) {
            setError('The passwords do not match. Please try again.');
            return;
        }

        try {
            setLoading(true); // Begin loading
            const result = await registerUser(formData);
            if (result.success) {
                // If registration is successful
                console.log('Registration successful', result.message);
                // Redirect or perform additional actions upon successful registration
                router.push('/auth/login'); // Redirect to login page (change this line based on your routing library if not using Next.js)
            } else {
                // If registration failed, set the error message from the server if available
                setError(result.message);
                console.log('Registration failed', result.message);
            }
        } catch (error) {
            // If there's an error during registration, handle it here
            // You might want to set an error state to show the error message on your form
            setError('An unexpected error occurred. Please try again later.');
            console.error('Registration error:', error);
        } finally {
            setLoading(false); // Stop loading regardless of the outcome
        }
    };


    return (
        <div>
            <section className="bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
                    {/* Logo */}
                    <a href="#" className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
                        <img className="h-8 mr-2" src="/logo.png" alt="logo" />
                    </a>
                    {/* Registration Form */}
                    <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
                        <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                                {step === 1 ? "Create an organization account" : "Create an organization account"}
                            </h1>
                            {error && <p className="text-error">{error}</p>} {/* Display error message here */}
                            <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                                {step > 1 && (
                                    <button type="button" onClick={goToPreviousStep} className="flex items-center justify-center px-4 py-2 text-sm font-medium leading-5 text-gray-700 transition duration-150 ease-in-out bg-gray-100 border border-transparent rounded-lg hover:text-gray-500 focus:outline-none focus:shadow-outline-blue active:bg-gray-50 active:text-gray-800">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back
                                    </button>
                                )}
                                {/* Fields for Step 1 */}
                                {step === 1 && (
                                    <>
                                        {/* First Name */}
                                        <div>
                                            <label htmlFor="firstname" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">First Name</label>
                                            <input type="text" name="firstname" id="firstname" value={formData.firstname} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="John" required />
                                        </div>
                                        {/* Last Name */}
                                        <div>
                                            <label htmlFor="lastname" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Last Name</label>
                                            <input type="text" name="lastname" id="lastname" value={formData.lastname} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Doe" required />
                                        </div>
                                        {/* Company Name */}
                                        <div>
                                            <label htmlFor="company" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Company Name</label>
                                            <input type="text" name="company" id="company" value={formData.company} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Contoso Ltd." required />
                                        </div>
                                    </>
                                )}
                                {/* Fields for Step 2 */}
                                {step === 2 && (
                                    <>
                                        {/* Email */}
                                        <div>
                                            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your email</label>
                                            <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="name@company.com" required />
                                        </div>
                                        {/* Password */}
                                        <div>
                                            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
                                            <input type="password" name="password" id="password" value={formData.password} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
                                            {/* Password Requirements */}
                                            <div className="text-sm mt-2">
                                                <p>Password must have:</p>
                                                <ul>
                                                    <li className={passwordLength ? 'text-green-500' : 'text-red-500'}>At least 12 characters</li>
                                                    <li className={uppercase ? 'text-green-500' : 'text-red-500'}>An uppercase letter</li>
                                                    <li className={lowercase ? 'text-green-500' : 'text-red-500'}>A lowercase letter</li>
                                                    <li className={number ? 'text-green-500' : 'text-red-500'}>A number</li>
                                                    <li className={symbol ? 'text-green-500' : 'text-red-500'}>A symbol (!@#$%^&* etc.)</li>
                                                </ul>
                                            </div>
                                        </div>
                                        {/* Confirm Password */}
                                        <div>
                                            <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Confirm password</label>
                                            <input type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
                                        </div>
                                    </>
                                )}
                                {/* Submit Button */
                                /*@ts-ignore*/}
                                {step === 1 ? (
                                    // Next button for the first step
                                    <button type="button" onClick={goToNextStep} className="btn w-full btn-primary">
                                        Next
                                    </button>
                                ) : (
                                    // Register button for the second step
                                    <button type="submit" className={`btn w-full ${loading ? 'bg-gray-400' : 'btn-primary'}`} disabled={loading}>
                                        {loading ? 'Loading...' : 'Register'}
                                    </button>
                                )}

                                {/* Redirect to Login */}
                                <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                                    Already have an account? <a href="/auth/login" className="font-medium text-primary-600 hover:underline dark:text-primary-500">Login here</a>
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Register;
