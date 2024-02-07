//MyPlan.tsx:
"use client"
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { continueWithFreePlan, create_checkout_session, manageAccount, getSubscriptionStatus } from "@/server/payment/plan";
import { useFormState } from 'react-dom';
//@ts-ignore

export default function MyPlan({ onClose }) {
    const [formData, setFormData] = useState({
        stripe_lookup_key: ''
    });

    const initialState = {
        message: null,
        success: false,
        error: false
    }
    const [state, formAction] = useFormState(create_checkout_session, initialState);

    const [formData2, setFormData2] = useState({
        stripe_lookup_key: ''
    });

    const initialState2 = {
        message: null,
        success: false,
        error: false
    }
    //@ts-ignore
    const [state2, formAction2] = useFormState(continueWithFreePlan, initialState2);

    const [pricing, setPricing] = useState([

        {
            id: 2,
            title: "Basic",
            price: 12,
            description: "Perfect for event organizers with up to 20 events/month.",
            stripe_lookup_key: "basic_plan",
            label: "Subscribe to Basic",
            //current: true,
            features: [
                { text: "Everything included in Hobby", type: "included" },
                { text: "Create up to 20 events per month", type: "included" },
                { text: "Basic event features enabled", type: "included" },
                { text: "Event advertising as add-on with 20% discount", type: "partially-included" },
                { text: "10% commission per event", type: "partially-included" },
            ],
        },
        {
            id: 3,
            title: "Premium",
            price: 28,
            description: "Perfect for event organizers with lots of events.",
            stripe_lookup_key: "premium_plan",
            label: "Subscribe to Premium",
            features: [
                { text: "Everything included in Basic", type: "included" },
                { text: "Create unlimited events per month", type: "included" },
                { text: "Premium event features enabled", type: "included" },
                { text: "All event advertising features are enabled", type: "included" },
                { text: "3% commission per event", type: "partially-included" }
            ],
        },
    ]);

    const [currentPlan, setCurrentPlan] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const updatePricingAndCurrentPlan = async () => {
            try {
                setIsLoading(true); // Start loading
                const subscriptionStatus = await getSubscriptionStatus();

                if (subscriptionStatus && subscriptionStatus.status === 'active') {
                    const updatedPricing = pricing.map(plan => ({
                        ...plan,
                        current: plan.stripe_lookup_key === subscriptionStatus.plan
                    }));
                    setPricing(updatedPricing);
                    //@ts-ignore
                    setCurrentPlan(subscriptionStatus.plan);
                } else {
                    setCurrentPlan('Hobby');
                }
            } catch (error) {
                console.error('Error updating pricing and current plan:', error);
            } finally {
                setIsLoading(false); // Stop loading regardless of success or failure
            }
        };

        updatePricingAndCurrentPlan();
    }, []);


    const TickSvg = () => (
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    );

    const XSvg = () => (
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
            <path d="M8 8l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M16 8l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
    );

    const PartialSvg = () => (
        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );


    return (
        <>

            {isLoading ? (
                <></>
            ) : (
                <>
                    <div className="fixed inset-0 z-50 w-full h-full top-0 left-0 bg-black bg-opacity-50 flex justify-center overflow-auto">
                        <div className="bg-white rounded-xl lg:w-[60%] h-fit pb-4 mb-auto mt-auto">
                            <div className="w-full bg-black bg-opacity-10 p-5 text-left text-xl font-semibold flex flex-row justify-between">
                                <div>Upgrade your plan</div>
                                <button onClick={onClose} className="text-lg font-bold hover:text-gray-700"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width={20} height={20}><path d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z" /></svg></button>
                            </div>

                            {currentPlan === 'Hobby' && (
                                <div className="p-2">
                                    <div role="alert" className="alert alert-warning">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        <span>You are currently using a Hobby subscription!</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-wrap justify-center">
                                {pricing.map((item, key) => (
                                    <div
                                        className="px-0 md:px-3 mt-8 sm:w-full lg:w-[500px]"
                                        key={key}
                                    >
                                        <div className="flex flex-col pt-8 pb-8 bg-zinc-50 hover:bg-white dark:bg-gray-800 dark:hover:bg-black rounded-md shadow shadow-slate-200 dark:shadow-slate-700 transition duration-500">
                                            <div className="px-8 pb-8">
                                                <h3 className="mb-6 text-lg md:text-xl font-semibold dark:text-white">
                                                    {item.title}
                                                </h3>
                                                <div className="mb-6 dark:text-white/70">
                                                    <span className="relative -top-5 text-2xl">$</span>
                                                    <span className="text-5xl font-semibold dark:text-white">
                                                        {item.price}
                                                    </span>
                                                    <span className="inline-block ms-1">/ month</span>
                                                </div>
                                                <p className="mb-6 text-slate-430 dark:text-slate-300">
                                                    {item.description}
                                                </p>
                                                {/*@ts-ignore*/}
                                                {item.current ? <>

                                                    <Link
                                                        href={`#`}
                                                        className="btn btn-disabled border-primary text-white rounded-md w-full"
                                                    >
                                                        Current plan
                                                    </Link>
                                                </>
                                                    :
                                                    <>
                                                        <form action={formAction}>
                                                            <input type="hidden" name="lookup_key" value={item.stripe_lookup_key} />
                                                            <input type="hidden" name="successUrl" value="/dashboard" />
                                                            <input type="hidden" name="errorUrl" value="/dashboard" />
                                                            <button className="btn bg-primary border-primary text-white rounded-md w-full" id="checkout-and-portal-button" type="submit">{item.label}</button>
                                                        </form>
                                                    </>
                                                }

                                            </div>
                                            <div className="border-b border-slate-200 dark:border-slate-700"></div>
                                            <ul className="self-start px-8 pt-8">
                                                {item.features.map((subitem, index) => (
                                                    <li
                                                        className="flex items-center my-1 text-slate-400 dark:text-slate-300"
                                                        key={index}
                                                    >
                                                        <div className="flex flex-row gap-3 items-center">
                                                            {/* Conditional rendering based on the feature type */}
                                                            <div className={`${subitem.type === "included"
                                                                ? "text-success"
                                                                : subitem.type === "not-included"
                                                                    ? "text-error"
                                                                    : "text-slate-400"
                                                                } dark:text-slate-300`}>
                                                                {subitem.type === "included" && <TickSvg />}
                                                                {subitem.type === "not-included" && <XSvg />}
                                                                {subitem.type === "partially-included" && <PartialSvg />}
                                                            </div>
                                                            <span>{subitem.text}</span>
                                                        </div>
                                                    </li>
                                                ))}
                                                {
                                                    //@ts-ignore
                                                    item.current ? <>

                                                        <form method="POST" action={manageAccount} className="">
                                                            <button type="submit" className="link text-center text-sm text-slate-900">Manage billing</button>
                                                        </form>
                                                    </>
                                                        :
                                                        <> </>
                                                }
                                            </ul>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
