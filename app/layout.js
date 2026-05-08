import './globals.css'

export const metadata = {
  title: 'Ruqia Geo Tracker',
  description: 'Field Case Geo Tracking System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          tailwind.config = {
            darkMode: "class",
            theme: {
              extend: {
                "colors": {
                  "on-tertiary": "#3e2e00",
                  "on-primary": "#00363d",
                  "on-error-container": "#ffdad6",
                  "surface-container-high": "#242b2d",
                  "secondary-container": "#43474b",
                  "secondary-fixed": "#e0e3e7",
                  "on-secondary-fixed-variant": "#43474b",
                  "primary-fixed": "#9cf0ff",
                  "tertiary-fixed-dim": "#f3bf26",
                  "background": "#0d1516",
                  "primary": "#c3f5ff",
                  "on-background": "#dce4e5",
                  "outline-variant": "#3b494c",
                  "tertiary": "#ffeac0",
                  "surface-container-highest": "#2e3638",
                  "on-primary-container": "#00626e",
                  "on-secondary": "#2d3134",
                  "error": "#ffb4ab",
                  "surface-container-low": "#151d1e",
                  "on-primary-fixed": "#001f24",
                  "on-error": "#690005",
                  "primary-container": "#00e5ff",
                  "secondary": "#c4c7cb",
                  "surface-dim": "#0d1516",
                  "on-surface": "#dce4e5",
                  "surface": "#0d1516",
                  "on-secondary-fixed": "#181c1f",
                  "surface-variant": "#2e3638",
                  "tertiary-fixed": "#ffdf96",
                  "surface-bright": "#333a3c",
                  "surface-container": "#192122",
                  "inverse-primary": "#006875",
                  "tertiary-container": "#fec931",
                  "on-secondary-container": "#b2b5b9",
                  "outline": "#849396",
                  "inverse-surface": "#dce4e5",
                  "on-primary-fixed-variant": "#004f58",
                  "secondary-fixed-dim": "#c4c7cb",
                  "on-tertiary-fixed": "#251a00",
                  "primary-fixed-dim": "#00daf3",
                  "on-tertiary-container": "#6f5500",
                  "surface-container-lowest": "#080f11",
                  "on-tertiary-fixed-variant": "#594400",
                  "error-container": "#93000a",
                  "on-surface-variant": "#bac9cc",
                  "surface-tint": "#00daf3",
                  "inverse-on-surface": "#2a3233"
                },
                "borderRadius": {
                  "DEFAULT": "0.25rem",
                  "lg": "0.5rem",
                  "xl": "0.75rem",
                  "full": "9999px"
                },
                "spacing": {
                  "unit": "4px",
                  "stack-loose": "20px",
                  "panel-padding": "12px",
                  "stack-compact": "8px",
                  "margin": "24px",
                  "gutter": "16px"
                },
                "fontFamily": {
                  "body-sm": ["Cairo"],
                  "body-lg": ["Cairo"],
                  "h2": ["Cairo"],
                  "h1": ["Cairo"],
                  "label-caps": ["Cairo"],
                  "mono-data": ["Cairo"]
                }
              }
            }
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
