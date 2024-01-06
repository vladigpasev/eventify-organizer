import React from 'react'
import { redirect } from 'next/navigation'


function AuthRedirector() {
    redirect('/auth/login');
}

export default AuthRedirector