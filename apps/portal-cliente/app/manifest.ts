import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "ZentiFlow Portal",
        short_name: "ZentiFlow",
        description: "Portal de gestión para tu negocio",
        start_url: "/",
        display: "standalone",
        background_color: "#0f0f0f",
        theme_color: "#c9a96e",
        orientation: "portrait-primary",
        icons: [
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
        ],
    };
}