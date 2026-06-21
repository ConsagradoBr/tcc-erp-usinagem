import re
from datetime import datetime as dt

_VALOR_PATTERNS = [
    r"Valor\s+Cobrado\s+([\d\.]+,\d{2})",
    r"Valor\s+do\s+Documento\s+([\d\.]+,\d{2})",
    r"R\$\s*([\d\.]+,\d{2})",
    r"([\d]{1,3}(?:\.\d{3})*,\d{2})",
]

_VENCIMENTO_PATTERNS = [
    r"Vencimento\s+(\d{2}/\d{2}/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?",
    r"(\d{2}/\d{2}/\d{4})\s+\d{2}:\d{2}:\d{2}",
]

_BENEFICIARIO_PATTERNS = [
    r"Benefici[aá]rio[:\s]*\n([A-Za-zÀ-ú][^\n]+)",
    r"Benefici[aá]rio\s+CNPJ[^\n]*\n([A-Za-zÀ-ú][^\n]+)",
    r"Benefici[aá]rio[:\s]+([A-Za-zÀ-ú][^\n]{4,})",
    r"Cedente[:\s]+([A-Za-zÀ-ú][^\n]+)",
]

_PAGADOR_PATTERNS = [
    r"Pagador\s*:\s*\n([A-Za-zÀ-ú][^\n]+)",
    r"Pagador\s+CPF[^\n]*\n([A-Za-zÀ-ú][^\n]+)",
    r"Pagador[:\s]+([A-Za-zÀ-ú][^\n]{4,})",
    r"Sacado[:\s]+([A-Za-zÀ-ú][^\n]+)",
]

_NFE_PATTERNS = [
    r"Nota\s+Fiscal\s+\(NF-e\)[^\n]*\n([\d]+)",
    r"NF-?e?\s*[nº#:]*\s*([\d\.]+)",
    r"nota\s+fiscal[:\s]*([\d\.]+)",
]

_DESCRICAO_PATTERNS = [
    r"Instru[cç][oõ]es[^\n]*\n(PARCELA[^\n]+)",
    r"Descri[cç][aã]o\s*/\s*Hist[oó]rico[^\n]+\n([^\n]+)",
    r"descri[cç][aã]o[:\s]+([^\n]+)",
    r"-\s*Referente:\s*([^\n]+)",
    r"referente[:\s]+([^\n]+)",
]


def _extrair_valor(texto):
    for pat in _VALOR_PATTERNS:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            try:
                valor = float(m.group(1).replace(".", "").replace(",", "."))
                if valor > 0:
                    return valor
            except Exception:
                pass
    return None


def _extrair_vencimento(texto):
    for pat in _VENCIMENTO_PATTERNS:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            try:
                return dt.strptime(m.group(1), "%d/%m/%Y").date().isoformat()
            except Exception:
                pass

    emissao_match = re.search(
        r"(?:emiss[aã]o|processamento)[^\d]*(\d{2}/\d{2}/\d{4})",
        texto,
        re.IGNORECASE,
    )
    emissao = emissao_match.group(1) if emissao_match else None
    for data in re.findall(r"(\d{2}/\d{2}/\d{4})", texto):
        if data != emissao:
            try:
                return dt.strptime(data, "%d/%m/%Y").date().isoformat()
            except Exception:
                pass
    return None


def _extrair_pessoa(patterns, texto):
    for pat in patterns:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            valor = m.group(1).strip().split("  ")[0].strip()
            if len(valor) > 4 and not re.match(r"^[\d\.\-/\s]+$", valor):
                return valor[:100]
    return None


def _extrair_nfe(texto):
    for pat in _NFE_PATTERNS:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def _extrair_descricao(texto, nfe=None):
    for pat in _DESCRICAO_PATTERNS:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            valor = m.group(1).strip()
            if nfe:
                valor = valor.replace(nfe, "").strip()
            if len(valor) > 4:
                return valor[:200]
    return None


def extrair_dados_boleto(texto):
    """Extrai campos estruturados de um boleto bancário a partir do texto extraído do PDF."""
    nfe = _extrair_nfe(texto)
    beneficiario = _extrair_pessoa(_BENEFICIARIO_PATTERNS, texto)
    descricao = _extrair_descricao(texto, nfe) or (
        f"Boleto - {beneficiario}" if beneficiario else None
    )

    return {
        "beneficiario": beneficiario,
        "pagador": _extrair_pessoa(_PAGADOR_PATTERNS, texto),
        "valor": _extrair_valor(texto),
        "vencimento": _extrair_vencimento(texto),
        "descricao": descricao,
        "nfe": nfe,
    }
