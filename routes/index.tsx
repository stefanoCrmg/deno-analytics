import { Head } from "$fresh/runtime.ts"
import Counter from "../islands/Counter.tsx"
import { Chart } from "https://deno.land/x/fresh_charts@0.2.1/mod.ts"
import { ChartColors } from "https://deno.land/x/fresh_charts@0.2.1/utils.ts"
import DarkMode from "../islands/DarkMode.tsx"

let _seed = Date.now()

export function srand(seed: number): void {
  _seed = seed
}

export function rand(min = 0, max = 0): number {
  _seed = (_seed * 9301 + 49297) % 233280
  return min + (_seed / 233280) * (max - min)
}

interface Config {
  min?: number
  max?: number
  from?: number[]
  count?: number
  decimals?: number
  continuity?: number
  rmin?: number
  rmax?: number
  prefix?: string
  section?: number
}

function numbers({
  min = 0,
  max = 100,
  from = [],
  count = 8,
  decimals = 8,
  continuity = 1,
}: Config = {}): (number | null)[] {
  const dfactor = Math.pow(10, decimals) || 0
  const data: (number | null)[] = []

  for (let i = 0; i < count; ++i) {
    const value = (from[i] || 0) + rand(min, max)
    if (rand() <= continuity) {
      data.push(Math.round(dfactor * value) / dfactor)
    } else {
      data.push(null)
    }
  }

  return data
}

export default function Home() {
  const pieCfg = { count: 5, min: 0, max: 100 }
  return (
    <>
      <Head>
        <title>Fresh App</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <img
          src="/logo.svg"
          class="w-32 h-32"
          alt="the fresh logo: a sliced lemon dripping with juice"
        />
        <p class="my-6">
          Welcome to `fresh`. Try updating this medssage in the
          ./routes/index.tsx file, and refresh.
        </p>
        <Counter start={3} />
        <DarkMode prev="system" />
        <div class="p-4 mx-auto max-w-screen-md">
          <Chart
            type="pie"
            options={{ devicePixelRatio: 1 }}
            data={{
              labels: ["Red", "Orange", "Yellow", "Green", "Blue"],
              datasets: [
                {
                  label: "Dataset 1",
                  data: numbers(pieCfg),
                  backgroundColor: [
                    ChartColors.Red,
                    ChartColors.Orange,
                    ChartColors.Yellow,
                    ChartColors.Green,
                    ChartColors.Blue,
                  ],
                },
              ],
            }}
          />
        </div>
      </div>
    </>
  )
}
