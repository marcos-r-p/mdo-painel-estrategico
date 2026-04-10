import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { DADOS } from '../data/seed'
import { formatCurrency, formatNumber } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import ProgressBar from '../components/ui/ProgressBar'
import KPICard from '../components/ui/KPICard'
import PieChart from '../components/charts/PieChart'
import DetailModal from '../components/ui/DetailModal'

interface EstoqueInfo {
  sku: string
  nome: string
  estoque: number
  custo: number
  valor: number
  totalValor: number
}

interface SelectedProduct {
  sku: string
  nome: string
  categoria: string
  qtd: number
  receita: number
  markup: number
  fatPercent: number
  estoqueInfo?: EstoqueInfo
}

export default function ProdutosPage() {
  useDocumentTitle('Produtos')
  const [searchParams] = useSearchParams()
  const _fonteAtiva = searchParams.get('fonte')

  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null)

  const categorias = DADOS.categorias || []
  const topProdutos = DADOS.topProdutos || []
  const curva = DADOS.curvaABC || {} as Record<string, number>
  const estoque = DADOS.estoque || {} as Record<string, unknown>
  const regioes = DADOS.regioes || []

  const categoriaPieData = categorias.map((c) => ({
    label: c.nome,
    value: c.receita,
  }))

  const regioesPieData = regioes.map((r) => ({
    label: r.uf,
    value: r.receita,
  }))

  const estoqueTop = ((estoque as Record<string, unknown>).topPorValor as EstoqueInfo[]) || []

  function handleProductClick(produto: typeof topProdutos[number]) {
    const estoqueInfo = estoqueTop.find((e) => e.sku === produto.sku)
    setSelectedProduct({ ...produto, estoqueInfo })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Produtos &amp; Estoque
        </h2>
      </div>

      {/* Top 20 Produtos */}
      <SectionCard title="Top 20 Produtos">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">SKU</th>
                <th className="pb-2 pr-3">Produto</th>
                <th className="pb-2 pr-3">Categoria</th>
                <th className="pb-2 pr-3 text-right">Qtd</th>
                <th className="pb-2 pr-3 text-right">Receita</th>
                <th className="pb-2 text-right">Markup</th>
              </tr>
            </thead>
            <tbody>
              {topProdutos.map((p, i) => (
                <tr
                  key={p.sku}
                  onClick={() => handleProductClick(p)}
                  className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {p.sku}
                  </td>
                  <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-200">
                    {p.nome}
                  </td>
                  <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">
                    {p.categoria}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">
                    {p.qtd}
                  </td>
                  <td className="py-2 pr-3 text-right font-medium text-gray-800 dark:text-gray-200">
                    {formatCurrency(p.receita)}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                    {p.markup.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.nome || 'Detalhes do Produto'}
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">SKU</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.sku}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Categoria</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.categoria}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Quantidade Vendida</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.qtd}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Receita</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(selectedProduct.receita)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Markup</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{selectedProduct.markup.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">% Faturamento</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.fatPercent}%</p>
              </div>
            </div>

            {selectedProduct.estoqueInfo && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
                <h4 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-300">Informacoes de Estoque</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Unidades: </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.estoqueInfo.estoque}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Custo unit.: </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(selectedProduct.estoqueInfo.custo)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Valor unit.: </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(selectedProduct.estoqueInfo.valor)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Valor total: </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(selectedProduct.estoqueInfo.totalValor)}</span>
                  </div>
                </div>
              </div>
            )}

            {!selectedProduct.estoqueInfo && (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                Sem dados de estoque detalhados para este produto.
              </p>
            )}
          </div>
        )}
      </DetailModal>

      {/* Categorias */}
      <SectionCard title="Categorias">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Progress bars */}
          <div className="space-y-3">
            {categorias.map((c) => (
              <ProgressBar
                key={c.nome}
                label={c.nome}
                value={c.receita}
                max={categorias[0]?.receita || 1}
                detail={`${formatCurrency(c.receita)} (${c.percentual}%)`}
                color="blue"
              />
            ))}
          </div>

          {/* Pie Chart */}
          <div className="flex items-center justify-center">
            <PieChart
              data={categoriaPieData}
              size={180}
            />
          </div>
        </div>
      </SectionCard>

      {/* Curva ABC */}
      <SectionCard title="Curva ABC">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Classe A */}
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/40">
            <p className="text-sm font-medium text-brand-700 dark:text-brand-400">Classe A</p>
            <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">{curva.classeA}</p>
            <p className="text-xs text-brand-600/70 dark:text-brand-500">produtos - 80% receita</p>
          </div>

          {/* Classe B */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Classe B</p>
            <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">{curva.classeB}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-500">produtos - 15% receita</p>
          </div>

          {/* Classe C */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/40">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Classe C</p>
            <p className="mt-1 text-3xl font-bold text-orange-600 dark:text-orange-400">{curva.classeC}</p>
            <p className="text-xs text-orange-600/70 dark:text-orange-500">produtos - 5% receita</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <ProgressBar
            label="Classe A"
            value={curva.classeA}
            max={curva.total}
            color="brand"
            detail={`${curva.classeA} de ${curva.total}`}
            showPercent
          />
          <ProgressBar
            label="Classe B"
            value={curva.classeB}
            max={curva.total}
            color="blue"
            detail={`${curva.classeB} de ${curva.total}`}
            showPercent
          />
          <ProgressBar
            label="Classe C"
            value={curva.classeC}
            max={curva.total}
            color="orange"
            detail={`${curva.classeC} de ${curva.total}`}
            showPercent
          />
        </div>
      </SectionCard>

      {/* Estoque */}
      <SectionCard title="Estoque">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Total SKUs"
            value={formatNumber(estoque.totalSKUs as number)}
            color="blue"
          />
          <KPICard
            label="Com Estoque"
            value={formatNumber(estoque.comEstoque as number)}
            color="brand"
          />
          <KPICard
            label="Valor Custo"
            value={formatCurrency(estoque.valorCusto as number)}
            subvalue="custo total em estoque"
            color="orange"
          />
          <KPICard
            label="Valor Venda"
            value={formatCurrency(estoque.valorVenda as number)}
            subvalue={`margem implicita: ${estoque.margemImplicita}%`}
            color="brand"
          />
        </div>

        {/* Top 5 por valor */}
        <div className="mt-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Top 5 por Valor em Estoque
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="pb-2 pr-3">SKU</th>
                  <th className="pb-2 pr-3">Produto</th>
                  <th className="pb-2 pr-3 text-right">Estoque</th>
                  <th className="pb-2 pr-3 text-right">Custo Unit.</th>
                  <th className="pb-2 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {estoqueTop.map((e) => (
                  <tr key={e.sku} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-3 font-mono text-xs text-gray-600 dark:text-gray-400">{e.sku}</td>
                    <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-200">{e.nome}</td>
                    <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">{e.estoque}</td>
                    <td className="py-2 pr-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(e.custo)}</td>
                    <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(e.totalValor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerta SKUs sem estoque */}
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/40">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
            Atencao: {formatNumber(estoque.semEstoque as number)} SKUs sem estoque
          </p>
          <p className="mt-1 text-xs text-orange-600 dark:text-orange-400">
            De {formatNumber(estoque.totalSKUs as number)} SKUs cadastrados, apenas {formatNumber(estoque.comEstoque as number)} possuem estoque disponivel.
            Considere desativar SKUs inativos ou reabastecer itens com demanda.
          </p>
        </div>
      </SectionCard>

      {/* Vendas por Estado */}
      <SectionCard title="Vendas por Estado">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Progress bars */}
          <div className="space-y-2">
            {regioes.map((r) => (
              <ProgressBar
                key={r.uf}
                label={r.uf}
                value={r.receita}
                max={regioes[0]?.receita || 1}
                detail={`${formatCurrency(r.receita)} (${r.percent}%)`}
                color="blue"
              />
            ))}
          </div>

          {/* Pie Chart */}
          <div className="flex flex-col items-center justify-start gap-4">
            <PieChart
              data={regioesPieData}
              size={180}
            />
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <p className="font-medium text-gray-700 dark:text-gray-300">Evolucao Regional</p>
              <p className="mt-1 text-xs">
                {DADOS.evolucaoRegional?.periodo1?.label}: {formatCurrency(DADOS.evolucaoRegional?.periodo1?.total)} ({DADOS.evolucaoRegional?.periodo1?.estados} estados)
                {' -> '}
                {DADOS.evolucaoRegional?.periodo2?.label}: {formatCurrency(DADOS.evolucaoRegional?.periodo2?.total)} ({DADOS.evolucaoRegional?.periodo2?.estados} estados)
                {' -> '}
                {DADOS.evolucaoRegional?.periodo3?.label}: {formatCurrency(DADOS.evolucaoRegional?.periodo3?.total)} ({DADOS.evolucaoRegional?.periodo3?.estados} estados)
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
