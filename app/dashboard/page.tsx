import EurSign from '@/public/images/icons/EurSign'
import EventTimeSvg from '@/public/images/icons/EventTime'
import GoSvg from '@/public/images/icons/GoSvg'
import LocationSvg from '@/public/images/icons/Location'
import Link from 'next/link'
import React from 'react'

function Dashboard() {
  return (
    <div className='p-5'>
      <div className='pb-5'><h1 className='text-xl font-medium'>My Events</h1></div>
      <div className='w-full flex flex-grow items-center justify-center'>
        <div className='grid md:grid-cols-4 sm:grid-cols-3 supersmall:grid-cols-2 grid-cols-1 gap-5 w-fit'>
          <div className='bg-white w-fit h-fit p-3 rounded'>
            <div className='pb-2'>
              <img src="/images/example.png" alt="Event Image" className='rounded' />
            </div>
            <div className='flex flex-col flex-grow'>
              <div className=" text-black text-base font-normal">Event name</div>
              <div className='flex items-center gap-1'><EventTimeSvg /><div className="text-stone-500 text-[10.36px] font-medium">Tue, Jan 30 | 06:00 Pm GMT+2</div></div>
              <div className='flex items-center gap-1'><LocationSvg /><div className="text-stone-500 text-[10.36px] font-medium">Da Vinci Bar</div></div>
              <div className='flex flex-row justify-between'>
                <div className='flex items-center gap-1'> <EurSign /> <div className="text-black text-xs font-medium leading-tight">From 15 BGN</div></div>
                <Link href="/"><div className='cursor-pointer text-blue-800 hover:opacity-80'><GoSvg /></div></Link>
              </div>
            </div>
          </div>
          <div className='bg-white w-fit h-fit p-3 rounded'>
            <div className='pb-2'>
              <img src="/images/example.png" alt="Event Image" className='rounded' />
            </div>
            <div className='flex flex-col flex-grow'>
              <div className=" text-black text-base font-normal">Event name</div>
              <div className='flex items-center gap-1'><EventTimeSvg /><div className="text-stone-500 text-[10.36px] font-medium">Tue, Jan 30 | 06:00 Pm GMT+2</div></div>
              <div className='flex items-center gap-1'><LocationSvg /><div className="text-stone-500 text-[10.36px] font-medium">Da Vinci Bar</div></div>
              <div className='flex flex-row justify-between'>
                <div className='flex items-center gap-1'> <EurSign /> <div className="text-black text-xs font-medium leading-tight">From 15 BGN</div></div>
                <Link href="/"><div className='cursor-pointer text-blue-800 hover:opacity-80'><GoSvg /></div></Link>
              </div>
            </div>
          </div>
          <div className='bg-white w-fit h-fit p-3 rounded'>
            <div className='pb-2'>
              <img src="/images/example.png" alt="Event Image" className='rounded' />
            </div>
            <div className='flex flex-col flex-grow'>
              <div className=" text-black text-base font-normal">Event name</div>
              <div className='flex items-center gap-1'><EventTimeSvg /><div className="text-stone-500 text-[10.36px] font-medium">Tue, Jan 30 | 06:00 Pm GMT+2</div></div>
              <div className='flex items-center gap-1'><LocationSvg /><div className="text-stone-500 text-[10.36px] font-medium">Da Vinci Bar</div></div>
              <div className='flex flex-row justify-between'>
                <div className='flex items-center gap-1'> <EurSign /> <div className="text-black text-xs font-medium leading-tight">From 15 BGN</div></div>
                <Link href="/"><div className='cursor-pointer text-blue-800 hover:opacity-80'><GoSvg /></div></Link>
              </div>
            </div>
          </div>
          <div className='bg-white w-fit h-fit p-3 rounded'>
            <div className='pb-2'>
              <img src="/images/example.png" alt="Event Image" className='rounded' />
            </div>
            <div className='flex flex-col flex-grow'>
              <div className=" text-black text-base font-normal">Event name</div>
              <div className='flex items-center gap-1'><EventTimeSvg /><div className="text-stone-500 text-[10.36px] font-medium">Tue, Jan 30 | 06:00 Pm GMT+2</div></div>
              <div className='flex items-center gap-1'><LocationSvg /><div className="text-stone-500 text-[10.36px] font-medium">Da Vinci Bar</div></div>
              <div className='flex flex-row justify-between'>
                <div className='flex items-center gap-1'> <EurSign /> <div className="text-black text-xs font-medium leading-tight">From 15 BGN</div></div>
                <Link href="/"><div className='cursor-pointer text-blue-800 hover:opacity-80'><GoSvg /></div></Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard