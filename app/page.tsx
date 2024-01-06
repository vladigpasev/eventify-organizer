import React from 'react'
import { redirect } from 'next/navigation'


function HomeRedirector() {
    redirect('/dashboard');
}

export default HomeRedirector