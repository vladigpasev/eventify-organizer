//Copyright (C) 2024  Vladimir Pasev
import { redirect } from 'next/navigation'


function HomeRedirector() {
    redirect('/dashboard');
}

export default HomeRedirector