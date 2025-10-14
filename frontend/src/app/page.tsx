'use client';

import { useState } from "react";
import { InteractiveMap } from "@/components/InteractiveMap";
import Image from "next/image";

export default function Home() {
  const [showImpact, setShowImpact] = useState(false);

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
          <span aria-hidden className="text-lg">↗</span>
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
              hipotético do mapa municipal. Descubra quais regiões precisariam ser agregadas, compare
              as projeções populacionais e avalie implicações territoriais em segundos.
            </p>
          </section>

          <div className="mt-12">
            <InteractiveMap />
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setShowImpact((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-500/20 dark:border-emerald-300/50 dark:text-emerald-200"
              >
                O que isso muda no final?
                <span aria-hidden className="text-base">{showImpact ? "−" : "+"}</span>
              </button>
            </div>

            {showImpact && (
              <section className="mt-8 space-y-6 rounded-3xl border border-emerald-200/60 bg-white/80 p-8 shadow-xl shadow-emerald-500/10 backdrop-blur dark:border-emerald-300/30 dark:bg-slate-900/80">
                <div className="grid gap-6 md:grid-cols-2">
                  <article className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      1. Estrutura original
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <li>• 5.570 municípios</li>
                      <li>
                        • População mínima: <strong>771 hab</strong>
                      </li>
                      <li>
                        • População máxima: <strong>12.396.372 hab</strong>
                      </li>
                      <li>
                        • Altíssima fragmentação administrativa: muitos municípios pequenos, baixa
                        escala e custo fixo elevado por habitante.
                      </li>
                    </ul>
                  </article>
                  <article className="rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      2. Estrutura agregada
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <li>• 1.846 regiões (agregadas)</li>
                      <li>
                        • População mínima: <strong>30.011 hab</strong>
                      </li>
                      <li>
                        • População máxima: <strong>12.396.372 hab</strong>
                      </li>
                      <li>• Redução de ≈ 66,9% no número de entes administrativos.</li>
                    </ul>
                  </article>
                </div>

                <article className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-purple-500/10 p-6 shadow-sm dark:border-slate-700 dark:from-sky-900/30 dark:via-emerald-900/20 dark:to-purple-900/30">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    3. Interpretação econômica
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    Ao consolidar municípios em regiões maiores, os ganhos vêm de economia de escala e
                    redução de redundâncias administrativas.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        a) Custos administrativos diretos
                      </h4>
                      <p className="mt-2">
                        Municípios atuais mantêm prefeitura, câmara, secretarias, jurídico etc. Estimando
                        R$ 20 milhões/ano em custos administrativos por município:
                      </p>
                      <table className="mt-3 w-full text-xs">
                        <thead>
                          <tr className="text-left text-slate-500">
                            <th className="pb-1">Estrutura</th>
                            <th className="pb-1">Qtd.</th>
                            <th className="pb-1">Custo médio</th>
                            <th className="pb-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="font-medium text-slate-700 dark:text-slate-200">
                          <tr>
                            <td className="py-1">Municípios atuais</td>
                            <td className="py-1">5.570</td>
                            <td className="py-1">R$ 20 mi</td>
                            <td className="py-1 text-right">R$ 111,4 bi</td>
                          </tr>
                          <tr>
                            <td className="py-1">Regiões agregadas</td>
                            <td className="py-1">1.846</td>
                            <td className="py-1">R$ 25 mi</td>
                            <td className="py-1 text-right">R$ 46,1 bi</td>
                          </tr>
                          <tr>
                            <td className="py-1 font-semibold">Diferença</td>
                            <td className="py-1">—</td>
                            <td className="py-1">—</td>
                            <td className="py-1 text-right text-emerald-600 dark:text-emerald-300">
                              ≈ R$ 65,3 bi/ano
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        b) Custos indiretos e eficiência
                      </h4>
                      <ul className="mt-2 space-y-2">
                        <li>• Compras centralizadas → descontos de 5–15%.</li>
                        <li>• Planejamento unificado → menos obras duplicadas.</li>
                        <li>• Saúde e educação com menor ociosidade.</li>
                        <li>• Sistemas compartilhados → menor custo de TI.</li>
                      </ul>
                      <p className="mt-2 text-sm">
                        Ganhos adicionais estimados em <strong>R$ 20 – 30 bi/ano</strong>, apoiados em
                        dados de consórcios intermunicipais e regiões metropolitanas.
                      </p>
                    </div>
                  </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    4. Estimativa total de economia
                  </h3>
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="pb-1">Tipo de economia</th>
                        <th className="pb-1 text-right">Estimativa (R$ bi/ano)</th>
                      </tr>
                    </thead>
                    <tbody className="font-medium text-slate-700 dark:text-slate-200">
                      <tr>
                        <td className="py-1">Custos administrativos diretos</td>
                        <td className="py-1 text-right">50 – 70</td>
                      </tr>
                      <tr>
                        <td className="py-1">Compras/eficiência operacional</td>
                        <td className="py-1 text-right">20 – 30</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-semibold">Total potencial</td>
                        <td className="py-1 text-right font-semibold text-emerald-600 dark:text-emerald-300">
                          70 – 100
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    5. Impacto agregado
                  </h3>
                  <ul className="mt-3 space-y-2">
                    <li>• Equivale a ~1% do PIB brasileiro (≈ R$ 10 trilhões).</li>
                    <li>• Cerca de R$ 330 mil/ano por município atual extinto.</li>
                    <li>• Expandiria a capacidade de investimento público sem elevar impostos.</li>
                  </ul>
                </article>
              </section>
            )}
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
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                Reprodutibilidade
              </h3>
              <p>
                Execute <code>python3 src/merge_municipalities.py</code> para atualizar os GeoJSONs e,
                depois, <code>bun dev</code> em <code>frontend/</code> para visualizar o painel.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
