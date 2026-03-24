import re
from datetime import datetime as dt


def extrair_dados_boleto(texto):
    dados = {"beneficiario": None, "pagador": None, "valor": None, "vencimento": None, "descricao": None, "nfe": None}
    for pat in [r"Valor\s+Cobrado\s+([\d\.]+,\d{2})", r"Valor\s+do\s+Documento\s+([\d\.]+,\d{2})", r"R\$\s*([\d\.]+,\d{2})", r"([\d]{1,3}(?:\.\d{3})*,\d{2})"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            try:
                valor = float(m.group(1).replace(".", "").replace(",", "."))
                if valor > 0:
                    dados["valor"] = valor
                    break
            except Exception:
                pass
    for pat in [r"Vencimento\s+(\d{2}/\d{2}/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?", r"(\d{2}/\d{2}/\d{4})\s+\d{2}:\d{2}:\d{2}"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            try:
                dados["vencimento"] = dt.strptime(m.group(1), "%d/%m/%Y").date().isoformat()
                break
            except Exception:
                pass
    if not dados["vencimento"]:
        emissao_match = re.search(r"(?:emiss[aã]o|processamento)[^\d]*(\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
        emissao = emissao_match.group(1) if emissao_match else None
        for data in re.findall(r"(\d{2}/\d{2}/\d{4})", texto):
            if data != emissao:
                try:
                    dados["vencimento"] = dt.strptime(data, "%d/%m/%Y").date().isoformat()
                    break
                except Exception:
                    pass
    for pat in [r"Benefici[aá]rio[:\s]*\n([A-Za-zÀ-ú][^\n]+)", r"Benefici[aá]rio\s+CNPJ[^\n]*\n([A-Za-zÀ-ú][^\n]+)", r"Benefici[aá]rio[:\s]+([A-Za-zÀ-ú][^\n]{4,})", r"Cedente[:\s]+([A-Za-zÀ-ú][^\n]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            valor = m.group(1).strip().split("  ")[0].strip()
            if len(valor) > 4 and not re.match(r"^[\d\.\-/\s]+$", valor):
                dados["beneficiario"] = valor[:100]
                break
    for pat in [r"Pagador\s*:\s*\n([A-Za-zÀ-ú][^\n]+)", r"Pagador\s+CPF[^\n]*\n([A-Za-zÀ-ú][^\n]+)", r"Pagador[:\s]+([A-Za-zÀ-ú][^\n]{4,})", r"Sacado[:\s]+([A-Za-zÀ-ú][^\n]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            valor = m.group(1).strip().split("  ")[0].strip()
            if len(valor) > 4 and not re.match(r"^[\d\.\-/\s]+$", valor):
                dados["pagador"] = valor[:100]
                break
    for pat in [r"Nota\s+Fiscal\s+\(NF-e\)[^\n]*\n([\d]+)", r"NF-?e?\s*[nº#:]*\s*([\d\.]+)", r"nota\s+fiscal[:\s]*([\d\.]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            dados["nfe"] = m.group(1).strip()
            break
    for pat in [r"Instru[cç][oõ]es[^\n]*\n(PARCELA[^\n]+)", r"Descri[cç][aã]o\s*/\s*Hist[oó]rico[^\n]+\n([^\n]+)", r"descri[cç][aã]o[:\s]+([^\n]+)", r"-\s*Referente:\s*([^\n]+)", r"referente[:\s]+([^\n]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            valor = m.group(1).strip()
            if dados["nfe"]:
                valor = valor.replace(dados["nfe"], "").strip()
            if len(valor) > 4:
                dados["descricao"] = valor[:200]
                break
    if not dados["descricao"] and dados["beneficiario"]:
        dados["descricao"] = f"Boleto - {dados['beneficiario']}"
    return dados
