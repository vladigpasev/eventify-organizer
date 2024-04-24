"use client"
import React, { useState } from "react";
import Link from "next/link";
import { continueWithFreePlan, create_checkout_session } from "@/server/payment/plan";
import { useFormState } from 'react-dom';
//@ts-ignore

export default function Pricing() {
    const [formData, setFormData] = useState({
        stripe_lookup_key: ''
    });

    const initialState = {
        message: null,
        success: false,
        error: false
    }
    const [state, formAction] = useFormState(create_checkout_session, initialState);
    const [annualBilling, setAnnualBilling] = useState(false);

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

    const pricing = [
        {
            id: 1,
            title: "Hobby",
            monthly: { price: 0, stripe_lookup_key: "hobby_monthly", word: 'месец' },
            annual: { price: 0, stripe_lookup_key: "hobby_annual", word: 'година' }, // Example, usually the same as monthly if free
            description: "Перфектен за непрофесионални създатели на събития.",
            features: [
                { text: "Създай до 5 активни събития", type: "included" },
                { text: "Рекламиране на събитие като добавка (ОЧАКВАЙТЕ СКОРО)", type: "partially-included" },
                { text: "20% комисиона на събитие", type: "partially-included" },
            ],
            current: true,
        },
        {
            id: 2,
            title: "Basic",
            monthly: { price: 39.99, stripe_lookup_key: "basic_plan_month", word: 'месец' },
            annual: { price: 382.20, stripe_lookup_key: "basic_plan_year", word: 'година' }, // Assuming 2 months free
            description: "Перфектен за организатори с малък брой събития.",
            features: [
                { text: "Всичко, включено в Hobby", type: "included" },
                { text: "Създай до 15 активни събития", type: "included" },
                { text: "Рекламиране на събития с 15% отстъпка (ОЧАКВАЙТЕ СКОРО)", type: "partially-included" },
                { text: "15% комисиона на събитие", type: "partially-included" },
            ],
        },
        {
            id: 3,
            title: "Premium",
            monthly: { price: 59.99, stripe_lookup_key: "premium_plan_month", word: 'месец' },
            annual: { price: 575.05, stripe_lookup_key: "premium_plan_year", word: 'година' }, // Assuming 2 months free
            description: "Перфектен за организатори с много събития.",
            features: [
                { text: "Всичко, включено в Basic", type: "included" },
                { text: "Създай неограничен брой събития", type: "included" },
                { text: "Всички опции за рекламиране са включени (ОЧАКВАЙТЕ СКОРО)", type: "included" },
                { text: "8% комисиона на събитие", type: "partially-included" }
            ],
        },
    ];


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
    const handleAnnualToggle = () => {
        setAnnualBilling(!annualBilling);
    };


    return (
        <>
            <img src="/logo.png" alt="Eventify Logo" className="w-60 p-5" />
            <section className="py-10 px-6 lg:px-52" id="pricing">
                <div>
                    <div className="grid grid-cols-1 pb-8 text-center">
                        <h6 className="text-lg font-semibold text-blue-700 mb-3">НАШИТЕ ПЛАНОВЕ</h6>
                        <h3 className="mb-4 text-3xl lg:text-4xl font-bold">ЦЕНИ</h3>
                        <p className="text-slate-400 dark:text-slate-300 max-w-xl mx-auto">
                            Избери перфектния план за теб и твоите нужди
                        </p>

                        <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={annualBilling} onChange={handleAnnualToggle} value="" className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Плащане на година</span>
                        </label>


                    </div>
                    <div className="flex flex-wrap">
                        {pricing.map((item, key) => (
                            <div className="w-full md:w-1/2 lg:w-1/3 px-0 md:px-3 mt-8" key={key}>
                                <div className="flex flex-col pt-8 pb-8 bg-zinc-50 hover:bg-white dark:bg-gray-800 dark:hover:bg-black rounded-md shadow transition duration-500">
                                    <div className="px-8 pb-8">
                                        <h3 className="mb-6 text-lg md:text-xl font-semibold dark:text-white">{item.title}</h3>
                                        <div className="mb-6 dark:text-white/70">
                                            <span className="relative -top-5 text-2xl">лв</span>
                                            <span className="text-5xl font-semibold dark:text-white">
                                                {annualBilling ? item.annual.price : item.monthly.price}
                                            </span>
                                            <span className="inline-block ml-1">/ {annualBilling ? item.annual.word : item.monthly.word}</span>
                                        </div>
                                        <p className="mb-6 text-slate-430 dark:text-slate-300">{item.description}</p>
                                        {
                                            //@ts-ignore
                                            item.current ?
                                                <Link href={`#`} className="btn btn-disabled border-primary text-white rounded-md w-full">ТЕКУЩ ПЛАН</Link>
                                                :
                                                <form action={formAction}>
                                                    <input type="hidden" name="lookup_key" value={annualBilling ? item.annual.stripe_lookup_key : item.monthly.stripe_lookup_key} />
                                                    <input type="hidden" name="successUrl" value="/dashboard" />
                                                    <input type="hidden" name="errorUrl" value="/auth/paymentsetup/error" />
                                                    <button className="btn bg-primary border-primary text-white rounded-md w-full" type="submit">Поръчай</button>
                                                </form>
                                        }
                                    </div>
                                    <div className="border-b border-slate-200 dark:border-slate-700"></div>
                                    <ul className="self-start px-8 pt-8">
                                        {item.features.map((subitem, index) => (
                                            <li className="flex items-center my-1 text-slate-400 dark:text-slate-300" key={index}>
                                                <div className="flex flex-row gap-3 items-center">
                                                    <div className={`${subitem.type === "included" ? "text-success" : subitem.type === "not-included" ? "text-error" : "text-slate-400"} dark:text-slate-300`}>
                                                        {subitem.type === "included" && <TickSvg />}
                                                        {subitem.type === "not-included" && <XSvg />}
                                                        {subitem.type === "partially-included" && <PartialSvg />}
                                                    </div>
                                                    <span>{subitem.text}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center text-slate-400 dark:text-slate-300 mt-2">
                        <form action={formAction2}>
                            <button type="submit">Остани с Hobby план</button>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );

}
