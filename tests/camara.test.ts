import { afterEach, describe, expect, it, vi } from "vitest";
import { CAMARA_API, CamaraError, getDeputies, getDeputy, validateFilters } from "../src/lib/camara";
import fixture from "./fixtures/camara.json";

afterEach(() => vi.unstubAllGlobals());
const mockResponse = (body: unknown, status = 200) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));

describe("Filtros e segurança da consulta", () => {
  it("normaliza estado e busca", () => { expect(validateFilters({ uf: "ce", q: "  Albuquerque " })).toEqual({ uf: "CE", q: "Albuquerque", page: 1 }); });
  it.each([{ uf: "XX" }, { page: "0" }, { page: "1.5" }, { page: "101" }, { page: "abc" }, { page: "" }, { q: "a".repeat(101) }])("rejeita entrada inválida %j", input => { expect(() => validateFilters(input)).toThrow(CamaraError); });
  it("codifica a pesquisa sem criar parâmetros externos", async () => {
    mockResponse(fixture.list);
    await getDeputies({ uf: "CE", q: "a&siglaUf=SP", page: "2" });
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get("nome")).toBe("a&siglaUf=SP");
    expect(parsed.searchParams.get("siglaUf")).toBe("CE");
    expect(parsed.searchParams.get("pagina")).toBe("2");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("Integração com a Câmara", () => {
  it("recusa identificadores repetidos ou UF incompatível na lista", async () => {
    mockResponse({ dados: [...fixture.list.dados, fixture.list.dados[0]], links: [] });
    await expect(getDeputies({ uf: "CE" })).rejects.toThrow("identificadores duplicados");
    mockResponse(fixture.list);
    await expect(getDeputies({ uf: "SP" })).rejects.toThrow("UF solicitada");
  });
  it("não aceita perfil com identificador diferente do solicitado", async () => {
    mockResponse(fixture.detail);
    await expect(getDeputy("1")).rejects.toThrow("não corresponde");
  });

  it("valida uma amostra real obtida da API oficial", async () => {
    mockResponse(fixture.list);
    const result = await getDeputies({ uf: "CE" });
    expect(result.deputies[0].id).toBe(fixture.list.dados[0].id);
    expect(result.deputies[0].nome).toBe(fixture.list.dados[0].nome);
    expect(result.source).toContain(CAMARA_API);
    expect(result.hasNext).toBe(false);
  });
  it("preserva a existência da próxima página indicada pela fonte", async () => {
    mockResponse({ dados: fixture.list.dados, links: [{ rel: "next", href: `${CAMARA_API}/deputados?pagina=2` }] });
    expect((await getDeputies()).hasNext).toBe(true);
  });
  it("distingue uma consulta vazia de uma falha", async () => {
    mockResponse({ dados: [], links: [] });
    expect((await getDeputies({ q: "zzzzzzzzzzzzzz" })).deputies).toEqual([]);
  });
  it("rejeita respostas com estrutura incompatível", async () => {
    mockResponse({ dados: [{ id: "invalid" }], links: [] });
    await expect(getDeputies()).rejects.toThrow("formato dos dados oficiais mudou");
  });
  it("trata falhas HTTP sem retornar dados fictícios", async () => {
    mockResponse({ error: "Serviço indisponível" }, 503);
    await expect(getDeputies()).rejects.toMatchObject({ status: 502 });
  });
  it("trata falhas de rede e timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));
    await expect(getDeputies()).rejects.toThrow("não respondeu a tempo");
  });
  it("trata JSON inválido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>indisponível</html>")));
    await expect(getDeputies()).rejects.toThrow("não pôde ser lida");
  });
  it("valida o perfil real e campos nulos fornecidos pela Câmara", async () => {
    mockResponse(fixture.detail);
    const result = await getDeputy(String(fixture.detail.dados.id));
    expect(result.ultimoStatus.nome).toBe(fixture.detail.dados.ultimoStatus.nome);
    expect(result.ultimoStatus.email).toBeNull();
  });
  it("não expõe campos desnecessários do perfil, como CPF", async () => {
    mockResponse({ ...fixture.detail, dados: { ...fixture.detail.dados, cpf: "campo extra ignorado" } });
    expect(await getDeputy(String(fixture.detail.dados.id))).not.toHaveProperty("cpf");
  });
  it("não consulta IDs inválidos", async () => {
    const spy = vi.fn(); vi.stubGlobal("fetch", spy);
    await expect(getDeputy("../../anything")).rejects.toMatchObject({ status: 404 });
    expect(spy).not.toHaveBeenCalled();
  });
  it("preserva o 404 oficial de um parlamentar inexistente", async () => {
    mockResponse({}, 404);
    await expect(getDeputy("99999999")).rejects.toMatchObject({ status: 404 });
  });
});
