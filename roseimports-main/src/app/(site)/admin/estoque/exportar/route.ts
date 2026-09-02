import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  label: string;
  volume_ml: number | null;
  price_cents: number | null;
  stock_quantity: number;
  active: boolean;

  products: {
    name: string;
    active: boolean;
    categories: {
      name: string;
    } | null;
  } | null;
};

export async function GET(request: NextRequest) {
  /*
   * Garante que somente administrador
   * consiga exportar o estoque.
   */
  await requireAdminUser();

  const searchParams = request.nextUrl.searchParams;

  const filtro = searchParams.get("filtro") ?? "todos";
  const busca = searchParams.get("busca")?.trim() ?? "";

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      label,
      volume_ml,
      price_cents,
      stock_quantity,
      active,
      products (
        name,
        active,
        categories (
          name
        )
      )
    `);

  if (error) {
    return Response.json(
      {
        error: "Não foi possível carregar o estoque.",
      },
      {
        status: 500,
      },
    );
  }

  let rows = ((data ?? []) as unknown as Row[]).filter(
    (row) => row.products !== null,
  );

  /*
   * Ordena alfabeticamente.
   */
  rows.sort((a, b) => {
    const productA = a.products?.name ?? "";
    const productB = b.products?.name ?? "";

    const byName = productA.localeCompare(productB, "pt-BR");

    if (byName !== 0) {
      return byName;
    }

    return a.label.localeCompare(b.label, "pt-BR");
  });

  /*
   * Mesmo comportamento dos filtros
   * da tela de estoque.
   */
  if (filtro === "criticos") {
    rows = rows.filter(
      (row) =>
        row.active &&
        (row.products?.active ?? false) &&
        row.stock_quantity > 0 &&
        row.stock_quantity <= 2,
    );
  }

  if (filtro === "sem-estoque") {
    rows = rows.filter(
      (row) =>
        row.active &&
        (row.products?.active ?? false) &&
        row.stock_quantity <= 0,
    );
  }

  /*
   * Respeita a busca atual da tela.
   */
  if (busca) {
    const termo = busca.toLowerCase();

    rows = rows.filter((row) => {
      const productName =
        row.products?.name.toLowerCase() ?? "";

      const variantLabel =
        row.label.toLowerCase();

      return (
        productName.includes(termo) ||
        variantLabel.includes(termo)
      );
    });
  }

  /*
   * Criação do Excel.
   */
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Rose Imports";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Estoque");

  /*
   * Cabeçalho do relatório.
   */
  worksheet.mergeCells("A1:H1");

  const titleCell = worksheet.getCell("A1");

  titleCell.value = "Rose Imports — Relatório de Estoque";
  titleCell.font = {
    bold: true,
    size: 16,
  };

  titleCell.alignment = {
    vertical: "middle",
  };

  worksheet.getRow(1).height = 28;

  worksheet.mergeCells("A2:H2");

  worksheet.getCell("A2").value =
    `Gerado em ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date())}`;

  worksheet.getCell("A2").font = {
    italic: true,
    size: 10,
  };

  /*
   * Colunas.
   */
  worksheet.columns = [
    {
      key: "produto",
      width: 32,
    },
    {
      key: "categoria",
      width: 20,
    },
    {
      key: "variacao",
      width: 22,
    },
    {
      key: "volume",
      width: 13,
    },
    {
      key: "preco",
      width: 16,
    },
    {
      key: "quantidade",
      width: 14,
    },
    {
      key: "status",
      width: 18,
    },
    {
      key: "ativo",
      width: 14,
    },
  ];

  /*
   * Cabeçalho da tabela.
   */
  const headerRow = worksheet.getRow(4);

  headerRow.values = [
    "Produto",
    "Categoria",
    "Variação",
    "Volume",
    "Preço",
    "Quantidade",
    "Status",
    "Ativo",
  ];

  headerRow.font = {
    bold: true,
  };

  headerRow.alignment = {
    vertical: "middle",
  };

  headerRow.height = 22;

  /*
   * Produtos.
   */
  rows.forEach((row) => {
    const status = getStockStatus(row.stock_quantity);

    const active =
      row.active &&
      (row.products?.active ?? false);

    const excelRow = worksheet.addRow({
      produto:
        row.products?.name ?? "—",

      categoria:
        row.products?.categories?.name ?? "—",

      variacao:
        row.label || "—",

      volume:
        row.volume_ml
          ? `${row.volume_ml} ml`
          : "—",

      /*
       * Mantemos como número para
       * o Excel conseguir somar/filtrar.
       */
      preco:
        row.price_cents === null
          ? null
          : row.price_cents / 100,

      quantidade:
        row.stock_quantity,

      status,

      ativo:
        active ? "Sim" : "Não",
    });

    /*
     * Formato monetário brasileiro.
     */
    excelRow.getCell(5).numFmt =
      '"R$" #,##0.00';
  });

  /*
   * Linha de total.
   */
  const totalUnidades = rows.reduce(
    (total, row) =>
      total + Math.max(row.stock_quantity, 0),
    0,
  );

  const totalRow = worksheet.addRow([]);

  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(1).font = {
    bold: true,
  };

  totalRow.getCell(6).value = totalUnidades;
  totalRow.getCell(6).font = {
    bold: true,
  };

  /*
   * Congela cabeçalho ao rolar.
   */
  worksheet.views = [
    {
      state: "frozen",
      ySplit: 4,
    },
  ];

  /*
   * Filtro automático.
   */
  worksheet.autoFilter = {
    from: "A4",
    to: "H4",
  };

  /*
   * Gera arquivo.
   */
  const buffer = await workbook.xlsx.writeBuffer();

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  const filename =
    `estoque-rose-imports-${date}.xlsx`;

  return new Response(buffer, {
    status: 200,

    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      "Content-Disposition":
        `attachment; filename="${filename}"`,

      "Cache-Control":
        "no-store",
    },
  });
}

function getStockStatus(
  quantity: number,
) {
  if (quantity <= 0) {
    return "Sem estoque";
  }

  if (quantity <= 2) {
    return "Acabando";
  }

  return "Em estoque";
}
