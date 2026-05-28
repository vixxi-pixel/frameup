import { useEffect, useRef } from 'react'

export default function LandingPage() {
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    // Fetch and inject the landing page HTML
    fetch('/landing.html')
      .then(r => r.text())
      .then(html => {
        // Replace button actions to use React router navigation
        const modified = html
          .replace(/cursor:none/g, 'cursor:pointer')
          // Wire up signup/login buttons
          .replace(
            'class="cta-primary">Start free — no card needed</button>',
            'class="cta-primary" onclick="window.location.href=\'/signup\'">Start free — no card needed</button>'
          )
          .replace(
            'class="nav-btn-primary">Start free</button>',
            'class="nav-btn-primary" onclick="window.location.href=\'/signup\'">Start free</button>'
          )
          .replace(
            'class="nav-btn">Log in</button>',
            'class="nav-btn" onclick="window.location.href=\'/login\'">Log in</button>'
          )
          .replace(
            'class="plan-btn plan-btn-outline">Get started free</button>',
            'class="plan-btn plan-btn-outline" onclick="window.location.href=\'/signup\'">Get started free</button>'
          )
          .replace(
            'class="plan-btn plan-btn-gold">Start 14-day trial</button>',
            'class="plan-btn plan-btn-gold" onclick="window.location.href=\'/signup\'">Start 14-day trial</button>'
          )

        // Extract just the body content and styles
        document.open()
        document.write(modified)
        document.close()
      })
  }, [])

  return null
}
