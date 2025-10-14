'use client';

import { InteractiveMap } from "@/components/InteractiveMap";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <header className="mx-auto mb-6 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-6 py-4 shadow-lg shadow-emerald-500/10 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70 lg:px-8">
        <div className="flex items-center gap-4">
          <Image
            src="https://hexglyph.com/hexglyph-logo.png"
            alt="Hexglyph logo"
            width={48}
            height={48}
            className="rounded-xl shadow-md shadow-emerald-500/30"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Daniel Niebraz
            </p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Hexglyph</p>
          </div>
        </div>
        <a
          href="https://hexglyph.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-500/20 dark:border-emerald-300/50 dark:text-emerald-200"
        >
          hexglyph.com
          <span aria-hidden className="text-lg">
            ↗
          </span>
        </a>
      </header>
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 pb-12 lg:px-8">
        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl shadow-sky-500/10 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70 lg:p-10">
        <section className="flex flex-col gap-4">
          <span className="w-fit rounded-full bg-emerald-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            Experimento territorial
          </span>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 dark:text-slate-100 lg:text-5xl">
            Brasil reimaginado com municípios de no mínimo 30 mil habitantes
          </h1>
          <p className="max-w-3xl text-base text-slate-600 dark:text-slate-300">
            A partir das malhas e estimativas oficiais do IBGE, este painel propõe um redesenho
            hipotético do mapa municipal. Descubra quais regiões precisariam ser agregadas,
            compare as projeções populacionais e avalie implicações territoriais em segundos.
          </p>
        </section>

        <div className="mt-12">
          <InteractiveMap />
        </div>

        <section className="mt-12 grid gap-6 border-t border-slate-200 pt-8 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
              Fonte dos dados
            </h3>
            <p>
              Malha municipal simplificada via <code>geobr</code> (2020) e estimativas populacionais
              IBGE 2021 (agregado 6579, variável 9324).
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
              Metodologia
            </h3>
            <p>
              Municípios abaixo do limiar foram mesclados iterativamente ao vizinho geográfico mais
              próximo (contiguidade ou centróide) até superar 30 mil habitantes.
            </p>
          </div>
        </section>
      </div>
      </main>
    </>
  );
}
