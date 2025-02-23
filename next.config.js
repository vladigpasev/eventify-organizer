/** @type {import('next').NextConfig} */
const nextConfig = {

    experimental: {
        serverComponentsExternalPackages: ["pdfkit"],
    },

    typescript: {
        ignoreBuildErrors: true
      },
    

}

module.exports = nextConfig
