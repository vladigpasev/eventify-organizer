/** @type {import('next').NextConfig} */
const nextConfig = {

    experimental: {
        serverComponentsExternalPackages: ["pdfkit"],
    },

}

module.exports = nextConfig
