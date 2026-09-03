import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseBulkProducts } from "./parser";

const SYNTHETIC_LIST = `
1. Lattafa Al Noble Safeer EDP 100 ml
   Quantidade: 1
2. Lattafa Al Noble Ameer EDP 100 ml
   Quantidade: 1
3. Lattafa Al Noble Wazeer EDP 100 ml
   Quantidade: 1
4. Kit Armaf Club de Nuit Iconic, perfume 105 ml + spray corporal 200 ml
   Quantidade: 1 kit
5. Al Wataniah Ameeri EDP 100 ml
   Quantidade: 1
6. Al Wataniah Kenz Al Malik EDP 100 ml
   Quantidade: 1
7. Kit Lattafa Asad Collection, 4 perfumes de 25 ml
   Quantidade: 1 kit
8. Mugler Angel Perfuming Body Lotion 200 ml
   Quantidade: 1
9. Lattafa Musamam Black Intense EDP 100 ml
   Quantidade: 1
10. Lattafa Jasoor EDP 100 ml
    Quantidade: 2
11. Armaf Club de Nuit Lionheart Man EDP 100 ml
    Quantidade: 1
12. Lattafa Hayaati Al Maleky EDP 100 ml
    Quantidade: 2
13. Lattafa Pride Al Areeq Gold EDP 100 ml
    Quantidade: 2
14. Lattafa Pride Ishq Al Shuyukh Silver EDP 100 ml
    Quantidade: 1
15. Lattafa Pride Kids Happy Brush EDP 75 ml
    Quantidade: 1
16. Lattafa Pride Kids Happy Time EDP 75 ml
    Quantidade: 1
17. Lattafa Pride Kids Stop Wait Go EDP 75 ml
    Quantidade: 1
18. Lattafa Pride Kids Riders EDP 75 ml
    Quantidade: 1
19. Lattafa Pride Kids Sing EDP 75 ml
    Quantidade: 1
20. Aurora Scents Café Citadel EDP 100 ml
    Quantidade: 1
21. Maison Alhambra Philos Centro EDP 100 ml
    Quantidade: 1
22. Rasasi Hawas For Him Kobra EDP 100 ml
    Quantidade: 1
23. Kit Lattafa Qaed Al Fursan Unlimited, perfume 90 ml + spray 200 ml
    Quantidade: 2 kits
24. Kit Maison Alhambra Salvo EDP 100 ml + loção corporal Savage 200 ml
    Quantidade: 1 kit
25. Carolina Herrera 212 Men NYC EDT 100 ml
    Quantidade: 2
26. Carolina Herrera 212 VIP Men EDT 100 ml
    Quantidade: 1
27. Carolina Herrera 212 VIP Black EDP 100 ml
    Quantidade: 1
28. Carolina Herrera 212 Sexy Men EDT 100 ml
    Quantidade: 1
29. Carolina Herrera 212 Heroes Men EDT 90 ml
    Quantidade: 1
30. Al Haramain L'Aventure Intense EDP 100 ml
    Quantidade: 1
`;

const WHATSAPP_LIST = `
BODY SPLASH, BODY MIST E DESODORANTES

6 BODY SPLASH ATHEERI "ABELHA"
51 BODY SPLASH VICTORIA'S SECRET
18 BODY SPLASH MAISON ALHAMBRA
20 BODY MIST LATTAFA
35 DESODORANTES PERFUMADOS ÁRABES FEMININOS
10 BODY SPLASH ÁRABES FEMININOS
25 DESODORANTES PERFUMADOS ÁRABES MASCULINOS
5 AFEEF LA BELLE ISABELLE, 250 ML
1 V.V. LOVE ETHEREAL MUSE, 250 ML
1 V.V. LOVE HUSHED NIGHTFALL, 250 ML
1 V.V. LOVE LUMINOUS MELODY, 250 ML
1 V.V. LOVE VELVET EMBRACE, 250 ML

CREMES CORPORAIS

2 BODY CREAM ROYAL AMBER
3 BODY CREAM ISABELLE LA BELLE
2 BODY CREAM SABAH AL WARD
4 BODY CREAM VENENO BIANCO, FRASCO DA COBRA
1 BODY CREAM DELILAH BLANC
1 BODY CREAM VULCAN AZUL
2 BODY CREAM FAKHAR ROSE, BRANCO
3 BODY CREAM YARA ROSA
3 AFEEF LA BELLE BODY CREAM, 200 ML
5 ASAD BODY CREAM, 200 ML
4 ATHEERI LA BELLE BODY CREAM, 200 ML

KITS

3 KITS YARA GRANDE LATTAFA
2 KITS TERIAQ LATTAFA
1 KIT DE MINIATURAS LATTAFA PRIDE FEMININO
4 KITS YARA COLLECTION, MINIATURAS DE 25 ML
1 KIT FAKHAR ROSE LATTAFA
3 KITS DE MINIATURAS LATTAFA PRIDE MASCULINO
3 KITS KHAMRAH LATTAFA
2 KITS QUEEN OF ARABIA FEMININO
1 KIT YARA MOI BRANCO
4 KITS FAKHAR CINZA MASCULINO

PERFUMES

10 MAYAR LATTAFA, 100 ML
3 CLUB DE NUIT INTENSE WOMAN
1 BARBEQ AL DHAHAB AL WATANIAH, 100 ML
1 KENZ AL MALIK AL WATANIAH, 100 ML
1 HAYATI AL WATANIAH, 100 ML
1 JASOOR LATTAFA, 100 ML
1 AL AREEQ GOLD, 100 ML
6 ASAD ELIXIR AZUL LATTAFA, 100 ML
4 ASAD ELIXIR PRETO LATTAFA, 100 ML
2 ASAD PRETO LATTAFA, 100 ML
5 ASAD BOURBON LATTAFA, 100 ML
4 PISA LATTAFA PRIDE "TORRE DE PISA", 100 ML
2 LIQUID BRUN FRENCH AVENUE, 100 ML
2 FAKHAR CINZA LATTAFA, MASCULINO, 100 ML
1 FAKHAR BLACK LATTAFA, 100 ML
5 AFEEF LATTAFA "PAVÃO", 100 ML
1 FREEZE CRANBY ASSALA "PICOLÉ ÁRABE"
2 AJWAD LATTAFA, 100 ML
3 AMBER ROUGE, 80 ML
1 AMEERAT AL ARAB, 100 ML
2 ANA ABIYEDH ROUGE LATTAFA, 100 ML
5 ANGHAM SECOND SONG LATTAFA, 100 ML
6 ANSAAM GOLD LATTAFA PRIDE, 100 ML
2 ATHEERI LATTAFA, 100 ML
2 BADEE AL OUD AMETHYST LATTAFA, 100 ML
6 BADEE AL OUD NOBLE BLUSH LATTAFA, 100 ML
1 BADEE AL OUD OUD FOR GLORY LATTAFA, 100 ML
6 BADEE AL OUD SUBLIME LATTAFA, 100 ML
1 CAFÉ CITADEL EAU DE PARFUM, 100 ML
2 CLUB DE NUIT, MINIATURA DE 30 ML
3 CLUB DE NUIT INTENSE MAN, 100 ML
2 DALAL, 100 ML
2 DELILAH BLANC/DELILAH POUR FEMME, 100 ML
Quantidade total: 2 unidades
11 ECLAIRE PISTACHE/ECLAIRE BANOFFI LATTAFA, 100 ML
Quantidade total: 11 unidades
12 FAKHAR ROSE LATTAFA, 100 ML
2 FORBIDDEN AL ABSAR, 100 ML
2 GOOD GIRL BLUSH CAROLINA HERRERA, 80 ML
1 GOOD GIRL CAROLINA HERRERA, 80 ML
4 HAYA, 100 ML
1 JOURI EAU DE PARFUM, 100 ML
1 QUEEN OF ARABIA LATTAFA PRIDE, 100 ML
3 ROYAL AMBER, DECANT DE 5 ML
3 ROYAL AMBER, 100 ML
3 SABAH AL WARD, 100 ML
1 SAKEENA, 100 ML
6 SHAGAF AL WARD, 100 ML
3 THARWAH GOLD LATTAFA, 100 ML
1 VERY GOOD GIRL CAROLINA HERRERA, 80 ML
4 VULCAN BAIE/VULCAN FEU/VULCAN SABLE, 100 ML
Quantidade total: 4 unidades
13 YARA PERFUMES LATTAFA, 100 ML
Variações: Yara Tous, Yara Candy, Yara Rosa e Yara Moi
Quantidade total: 13 unidades

MINIATURAS ONLYOU

1 ONLYOU 8186 ROYAL AMBER, 30 ML
2 ONLYOU AMEERAT AL ARAB, 30 ML
2 ONLYOU COLLECTION, 30 ML
2 ONLYOU COLLECTION Nº 8121, 30 ML
2 ONLYOU COLLECTION Nº 8170, 30 ML
1 ONLYOU PERFUME COLLECTION, 30 ML
2 ONLYOU PERFUME COLLECTION Nº 8128, 30 ML
2 ONLYOU PERFUME COLLECTION Nº 8133, 30 ML
1 ONLYOU PERFUME COLLECTION Nº 8143, 35 ML
2 ONLYOU PERFUME COLLECTION Nº 8189, 30 ML
2 ONLYOU PERFUME COLLECTION Nº 8190, 30 ML

QUANTIDADE TOTAL: 414 UNIDADES
`;

const REAL_INLINE_LIST = readFileSync(
  resolve(process.cwd(), "scripts/fixtures/whatsapp-stock-list.txt"),
  "utf8",
);

describe("parseBulkProducts", () => {
  it("padroniza nomes em maiúsculas e transforma apelidos entre aspas em sufixo", () => {
    const records = parseBulkProducts(`
      BODY SPLASH, BODY MIST E DESODORANTES
      6 BODY SPLASH ATHEERI “ABELHA”
      PERFUMES
      4 PISA LATTAFA PRIDE "TORRE DE PISA", 100 ML
    `);

    expect(records.map((record) => record.name)).toEqual([
      "ATHEERI - ABELHA",
      "PISA LATTAFA PRIDE - TORRE DE PISA",
    ]);
    expect(records.map((record) => record.slug)).toEqual([
      "atheeri-abelha",
      "pisa-lattafa-pride-torre-de-pisa",
    ]);
  });

  it("preserva os 30 registros da lista sintética completa", () => {
    const records = parseBulkProducts(SYNTHETIC_LIST);

    expect(records).toHaveLength(30);
    expect(records.map((record) => record.quantity)).toContain(2);
    expect(records.map((record) => record.volumeMl)).toEqual(
      expect.arrayContaining([75, 90, 100, 200]),
    );
  });

  it("interpreta produto comum, concentração, volume, marca e slug", () => {
    const [record] = parseBulkProducts(
      "Lattafa Jasoor EDP 100 ml\nQuantidade: 2",
    );

    expect(record).toMatchObject({
      name: "LATTAFA JASOOR",
      brand: "Lattafa",
      line: "JASOOR",
      concentration: "EDP",
      gender: null,
      volumeMl: 100,
      quantity: 2,
      isKit: false,
      normalizedName: "lattafa jasoor",
      slug: "lattafa-jasoor",
      issues: [],
    });
  });

  it("extrai gênero somente quando estiver explícito no texto", () => {
    const records = parseBulkProducts(`
      Lattafa Jasoor EDP 100 ml
      Quantidade: 1
      Club de Nuit Intense Woman EDP 100 ml
      Quantidade: 1
      Kit Lattafa Pride Masculino
      Quantidade: 1 kit
      Good Girl Carolina Herrera EDP 80 ml
      Quantidade: 1
    `);

    expect(records.map((record) => record.gender)).toEqual([
      null,
      "feminino",
      "masculino",
      null,
    ]);
  });

  it("usa somente o volume como nome da variante", () => {
    const records = parseBulkProducts(`
      Lattafa Jasoor EDP 100 ml, Masculino
      Quantidade: 1
      Royal Amber, decant de 5 ml, Unissex
      Quantidade: 3
      Kit Lattafa Asad Collection, 4 perfumes de 25 ml, Masculino
      Quantidade: 1 kit
    `);

    expect(records.map((record) => record.variantLabel)).toEqual([
      "100 ml",
      "5 ml decant",
      "Kit",
    ]);
  });

  it("preserva apóstrofos e números comerciais no nome", () => {
    const records = parseBulkProducts(`
      Al Haramain L'Aventure Intense EDP 100 ml
      Quantidade: 1
      Carolina Herrera 212 VIP Men EDT 100 ml
      Quantidade: 1
    `);

    expect(records[0]).toMatchObject({
      name: "AL HARAMAIN L'AVENTURE INTENSE",
      brand: "Al Haramain",
    });
    expect(records[1]).toMatchObject({
      name: "CAROLINA HERRERA 212 VIP MEN",
      brand: "Carolina Herrera",
      concentration: "EDT",
    });
  });

  it("interpreta kits e seus componentes sem inventar componentes ausentes", () => {
    const records = parseBulkProducts(`
      Kit Armaf Club de Nuit Iconic, perfume 105 ml + spray corporal 200 ml
      Quantidade: 1 kit
      Kit Lattafa Asad Collection, 4 perfumes de 25 ml
      Quantidade: 2 kits
      3 KITS KHAMRAH LATTAFA
      Kit Maison Alhambra Salvo EDP 100 ml + loção corporal Savage 200 ml
      Quantidade: 1 kit
    `);

    expect(records[0]).toMatchObject({
      name: "KIT ARMAF CLUB DE NUIT ICONIC",
      brand: "Armaf",
      isKit: true,
      quantity: 1,
      components: [
        { type: "perfume", volumeMl: 105, quantity: 1 },
        { type: "spray corporal", volumeMl: 200, quantity: 1 },
      ],
    });
    expect(records[1]).toMatchObject({
      name: "KIT LATTAFA ASAD COLLECTION",
      isKit: true,
      quantity: 2,
      components: [{ type: "perfume", volumeMl: 25, quantity: 4 }],
    });
    expect(records[2]).toMatchObject({
      name: "KIT KHAMRAH LATTAFA",
      isKit: true,
      quantity: 3,
      components: [],
    });
    expect(records[3]).toMatchObject({
      name: "KIT MAISON ALHAMBRA SALVO",
      components: [
        { type: "perfume", name: null, volumeMl: 100, quantity: 1 },
        {
          type: "loção corporal",
          name: "Savage",
          volumeMl: 200,
          quantity: 1,
        },
      ],
    });
  });

  it("ignora linhas em branco, normaliza espaços e sinaliza repetição no lote", () => {
    const records = parseBulkProducts(`

      Aurora   Scents Café Citadel EDP 100 ml
      Quantidade: 1

      aurora scents cafe citadel EDP 100 ml
      Quantidade: 1
    `);

    expect(records).toHaveLength(2);
    expect(records[0]?.normalizedName).toBe("aurora scents cafe citadel");
    expect(records[1]?.duplicateOfIndex).toBe(0);
  });

  it("aceita quantidade antes do nome e ignora cabeçalhos sem gerar registros", () => {
    const records = parseBulkProducts(`
      BODY SPLASH, BODY MIST E DESODORANTES
      6 BODY SPLASH ATHEERI 'ABELHA'
      CREMES CORPORAIS
      2 BODY CREAM ROYAL AMBER
    `);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      name: "ATHEERI - ABELHA",
      quantity: 6,
      productType: "body_splash",
      categorySlug: "perfumes",
    });
    expect(records[1]).toMatchObject({
      name: "ROYAL AMBER",
      quantity: 2,
      productType: "cosmetico",
      categorySlug: "cosmeticos",
    });
  });

  it("reserva cosméticos aos body creams e classifica todo o restante como perfume", () => {
    const records = parseBulkProducts(`
      BODY SPLASH, BODY MIST E DESODORANTES
      1 BODY SPLASH ATHEERI
      CREMES CORPORAIS
      1 BODY CREAM ROYAL AMBER
      KITS
      1 KIT YARA LATTAFA
      PERFUMES
      1 JASOOR LATTAFA, 100 ML
      MINIATURAS ONLYOU
      1 ONLYOU 8186 ROYAL AMBER, 30 ML
    `);

    expect(records.map((record) => record.categorySlug)).toEqual([
      "perfumes",
      "cosmeticos",
      "perfumes",
      "perfumes",
      "perfumes",
    ]);
  });

  it("preserva os 94 produtos e as 414 unidades da lista real", () => {
    const records = parseBulkProducts(WHATSAPP_LIST);
    const categoryCounts = records.reduce<Record<string, number>>(
      (counts, record) => {
        const category = record.categorySlug ?? "sem-categoria";
        counts[category] = (counts[category] ?? 0) + 1;
        return counts;
      },
      {},
    );

    expect(records).toHaveLength(94);
    expect(records.every((record) => record.categorySlug !== null)).toBe(true);
    expect(
      records.reduce((total, record) => total + record.quantity, 0),
    ).toBe(414);
    expect(records.some((record) => record.name === "QUANTIDADE TOTAL")).toBe(
      false,
    );
    expect(
      records.find(
        (record) =>
          record.name === "ROYAL AMBER" && record.variantType === "decant",
      ),
    ).toMatchObject({ volumeMl: 5, variantType: "decant" });
    expect(categoryCounts).toEqual({
      perfumes: 83,
      cosmeticos: 11,
    });
  });

  it("preserva os totais e pendências do formato inline enviado em anexo", () => {
    const records = parseBulkProducts(REAL_INLINE_LIST);
    const shared = records.filter((record) =>
      record.issues.includes("shared_quantity_between_variations"),
    );

    expect(records).toHaveLength(94);
    expect(records.reduce((total, record) => total + record.quantity, 0)).toBe(
      414,
    );
    expect(records.every((record) => record.categorySlug !== null)).toBe(true);
    expect(shared.map((record) => [record.name, record.quantity])).toEqual([
      ["DELILAH BLANC/DELILAH POUR FEMME", 2],
      ["ECLAIRE PISTACHE/ECLAIRE BANOFFI LATTAFA", 11],
      ["VULCAN BAIE/VULCAN FEU/VULCAN SABLE", 4],
      ["YARA PERFUMES LATTAFA", 13],
    ]);
  });

  it("não reparte quantidades totais compartilhadas entre variações", () => {
    const records = parseBulkProducts(WHATSAPP_LIST);
    const incomplete = records.filter((record) =>
      record.issues.includes("shared_quantity_between_variations"),
    );

    expect(incomplete).toHaveLength(4);
    expect(incomplete.map((record) => record.quantity)).toEqual([2, 11, 4, 13]);
    expect(incomplete[0]?.variations).toEqual([
      "DELILAH BLANC",
      "DELILAH POUR FEMME",
    ]);
    expect(incomplete[3]?.variations).toEqual([
      "Yara Tous",
      "Yara Candy",
      "Yara Rosa",
      "Yara Moi",
    ]);
  });

  it("mantém variações com barra em revisão mesmo sem a expressão quantidade total", () => {
    const [record] = parseBulkProducts(
      "2 DELILAH BLANC/DELILAH POUR FEMME, 100 ML",
    );

    expect(record).toMatchObject({
      quantity: 2,
      variations: ["DELILAH BLANC", "DELILAH POUR FEMME"],
      issues: ["shared_quantity_between_variations"],
    });
  });

  it("marca como incompleto um agrupamento de variações em uma única linha", () => {
    const [record] = parseBulkProducts(
      "Variações: Yara Tous, Yara Candy, Yara Rosa e Yara Moi — Quantidade total: 13 unidades",
    );

    expect(record).toMatchObject({
      quantity: 13,
      variations: ["Yara Tous", "Yara Candy", "Yara Rosa", "Yara Moi"],
      issues: ["shared_quantity_between_variations"],
    });
  });

  it("aceita quantidade no fim da mesma linha sem incorporá-la ao nome", () => {
    const records = parseBulkProducts(`
      BODY SPLASH, BODY MIST E DESODORANTES
      BODY SPLASH ATHEERI “ABELHA” Quantidade: 6 unidades
      PERFUMES
      DELILAH BLANC/DELILAH POUR FEMME, 100 ML Quantidade total: 2 unidades
      YARA PERFUMES LATTAFA, 100 ML Variações: Yara Tous, Yara Candy, Yara Rosa e Yara Moi Quantidade total: 13 unidades
    `);

    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      name: "ATHEERI - ABELHA",
      quantity: 6,
      productType: "body_splash",
      categorySlug: "perfumes",
    });
    expect(records[1]).toMatchObject({
      name: "DELILAH BLANC/DELILAH POUR FEMME",
      quantity: 2,
      variations: ["DELILAH BLANC", "DELILAH POUR FEMME"],
      issues: ["shared_quantity_between_variations"],
    });
    expect(records[2]).toMatchObject({
      name: "YARA PERFUMES LATTAFA",
      quantity: 13,
      variations: ["Yara Tous", "Yara Candy", "Yara Rosa", "Yara Moi"],
      issues: ["shared_quantity_between_variations"],
    });
  });

  it("não confunde produtos em caixa alta com cabeçalhos", () => {
    const records = parseBulkProducts(`
      PRODUTOS
      LATTAFA AL NOBLE SAFEER EDP 100 ML
      Quantidade: 1 unidade
      PRODUTOS ADICIONADOS
      LATTAFA ASAD BOURBON, MINIATURA, EAU DE PARFUM, 30 ML
      Quantidade: 3 unidades
    `);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      name: "LATTAFA AL NOBLE SAFEER",
      quantity: 1,
      concentration: "EDP",
      volumeMl: 100,
    });
    expect(records[1]).toMatchObject({
      name: "LATTAFA ASAD BOURBON",
      quantity: 3,
      concentration: "EDP",
      volumeMl: 30,
    });
  });

  it("ignora títulos de documento e linhas separadoras", () => {
    const records = parseBulkProducts(`
      -----------------------
      Relação para emissão da nota fiscal
      1. Lattafa Al Noble Safeer EDP 100 ml
      Quantidade: 1
      -----------------------
    `);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: "LATTAFA AL NOBLE SAFEER",
      quantity: 1,
    });
  });
});
