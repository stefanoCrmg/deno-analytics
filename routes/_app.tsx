import { Head } from "$fresh/runtime.ts"
import { AppProps } from "$fresh/src/server/types.ts"

export default function App({ Component }: AppProps) {
  const code = `function global_dark(change) {
    if (change === 'auto') delete localStorage.theme; else if (change === 'on') localStorage.theme = 'dark'; else if (change === 'off') localStorage.theme = 'light';
    window.isDark = localStorage.theme === "dark" || (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList[window.isDark ? 'add' : 'remove']("dark");
  }
  global_dark();`
  return (
    <html>
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: code,
          }}
        />
        <meta name="theme-color" />
      </Head>
      <body class="dark:text-gray-100
                    bg(deno-pattern gray-100
                       dark:dark-deno-pattern dark:sky-800
                    )">
        <main class="container mx-auto p-4">
          <Component />
        </main>
      </body>
    </html>
  )
}
