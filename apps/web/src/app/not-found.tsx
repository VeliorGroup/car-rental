import Link from 'next/link'
 
export default function NotFound() {
  return (
    <html>
      <body>
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50">
          <h2 className="text-2xl font-bold">Page Not Found</h2>
          <p className="mb-4">Could not find requested resource</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Return Home
          </Link>
        </div>
      </body>
    </html>
  )
}
