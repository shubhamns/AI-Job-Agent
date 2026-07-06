import re

from app.models.candidate_profile import CandidateProfile
from app.models.job_preference import JobPreference
from app.models.user import User
from app.schemas.profile import (
    CandidateProfileExtraction,
    CandidateProfileUpdate,
    JobPreferenceUpdate,
)

PHONE_RE = re.compile(
    r"(?:\+91[\s-]?)?[6-9]\d{9}|(?:\+1[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\+?\d{1,3}[\s-]?\d{6,14}"
)
EXPERIENCE_RE = re.compile(
    r"(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp)?",
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
SKILL_HEADERS = (
    "skills",
    "technical skills",
    "core skills",
    "key skills",
    "technologies",
    "tech stack",
    "tools",
    "competencies",
    "technical competencies",
)
SUMMARY_HEADERS = (
    "summary",
    "professional summary",
    "profile",
    "about",
    "about me",
    "career objective",
    "objective",
)
LOCATION_HEADERS = ("location", "address", "based in", "current location")
AUTH_HEADERS = ("work authorization", "authorization", "visa status", "work permit")
WORK_ARRANGEMENT_ONLY = frozenset(
    {
        "remote",
        "hybrid",
        "onsite",
        "on-site",
        "onsite-only",
        "remote-only",
        "hybrid-only",
        "wfh",
        "work",
        "from",
        "home",
        "only",
        "first",
    }
)
CONTACT_HEADERS = ("mobile", "phone", "email", "contact", "tel")
SECTION_PREFIXES = (
    SKILL_HEADERS
    + SUMMARY_HEADERS
    + LOCATION_HEADERS
    + AUTH_HEADERS
    + CONTACT_HEADERS
    + (
        "experience",
        "work experience",
        "employment",
        "education",
        "projects",
        "certifications",
        "contact",
    )
)


def _clean_line(line: str) -> str:
    return re.sub(r"^[\s•\-–—*]+", "", line.strip())


def _is_section_header(line: str) -> str | None:
    lower = line.lower().rstrip(":")
    if lower in SECTION_PREFIXES:
        return lower
    for header in SECTION_PREFIXES:
        if lower.startswith(f"{header}:"):
            return header
    return None


def _header_value(line: str) -> tuple[str | None, str | None]:
    header = _is_section_header(line)
    if not header:
        return None, None
    if ":" in line:
        value = line.split(":", 1)[1].strip()
        return header, value or None
    return header, None


def _split_skill_items(text: str) -> list[str]:
    parts = re.split(r"[,;|/•\n]", text)
    return [item.strip(" •-\t") for item in parts if item.strip(" •-\t")]


def _looks_like_name(line: str) -> bool:
    if EMAIL_RE.search(line) or PHONE_RE.search(line):
        return False
    words = line.split()
    if not 1 <= len(words) <= 5:
        return False
    alpha = sum(ch.isalpha() for ch in line)
    return alpha / max(len(line), 1) > 0.6 and not line.lower().startswith(SECTION_PREFIXES)


def _is_skill_item(text: str) -> bool:
    if PHONE_RE.search(text) or EMAIL_RE.search(text):
        return False
    header, _ = _header_value(text)
    return header not in CONTACT_HEADERS


def _extract_location_candidate(text: str) -> str | None:
    parts = [text.strip()]
    if "|" in text:
        parts = [part.strip() for part in text.split("|") if part.strip()]
    for part in parts:
        lower = part.lower()
        if "india" in lower or re.search(
            r"\b(bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|kolkata|remote)\b",
            lower,
        ):
            return part[:255]
    return None


def _extract_phone_from_line(line: str) -> str | None:
    match = PHONE_RE.search(line)
    return match.group(0).strip() if match else None


def _is_work_authorization_value(text: str) -> bool:
    cleaned = text.strip()
    if not cleaned:
        return False
    lower = cleaned.lower()
    if lower in WORK_ARRANGEMENT_ONLY:
        return False
    words = re.findall(r"[a-z]+", lower)
    if words and all(word in WORK_ARRANGEMENT_ONLY for word in words):
        return False
    return True


def _collect_section_lines(lines: list[str], start: int) -> tuple[list[str], int]:
    collected: list[str] = []
    index = start
    while index < len(lines):
        line = _clean_line(lines[index])
        if not line:
            index += 1
            continue
        if _is_section_header(line):
            break
        collected.append(line)
        index += 1
    return collected, index


def extract_basic_candidate_profile(resume_text: str) -> CandidateProfileExtraction:
    lines = [_clean_line(line) for line in resume_text.replace("\r\n", "\n").splitlines()]
    lines = [line for line in lines if line]
    full_text = "\n".join(lines)
    phone_match = PHONE_RE.search(full_text)
    phone = phone_match.group(0).strip() if phone_match else None
    years_experience = None
    exp_match = EXPERIENCE_RE.search(full_text)
    if exp_match:
        years_experience = int(exp_match.group(1))
    full_name = next((line[:255] for line in lines if _looks_like_name(line)), None)
    summary = None
    location = None
    work_authorization = None
    skills: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        header, inline_value = _header_value(line)
        if not header:
            index += 1
            continue
        if header in SKILL_HEADERS:
            chunk = [inline_value] if inline_value else []
            body, index = _collect_section_lines(lines, index + 1)
            chunk.extend(body)
            for item in chunk:
                for skill in _split_skill_items(item):
                    if (
                        skill
                        and _is_skill_item(skill)
                        and skill.lower() not in {s.lower() for s in skills}
                    ):
                        skills.append(skill[:120])
        elif header in SUMMARY_HEADERS:
            parts = [inline_value] if inline_value else []
            body, index = _collect_section_lines(lines, index + 1)
            parts.extend(body)
            summary = " ".join(part for part in parts if part)[:2000] or summary
        elif header in LOCATION_HEADERS:
            parts = [inline_value] if inline_value else []
            body, index = _collect_section_lines(lines, index + 1)
            parts.extend(body)
            location = ", ".join(part for part in parts if part)[:255] or location
        elif header in AUTH_HEADERS:
            parts = [inline_value] if inline_value else []
            body, index = _collect_section_lines(lines, index + 1)
            parts.extend(body)
            candidate = " ".join(part for part in parts if part)[:255]
            if candidate and _is_work_authorization_value(candidate):
                work_authorization = candidate
        elif header in CONTACT_HEADERS:
            phone = _extract_phone_from_line(inline_value or line) or phone
            index += 1
        else:
            index += 1
    if not skills:
        for line in lines:
            lower = line.lower()
            if lower.startswith(SKILL_HEADERS):
                _, inline = _header_value(line)
                source = inline or ""
                skills = _split_skill_items(source)
                break
    if not location:
        for line in lines:
            found = _extract_location_candidate(line)
            if found:
                location = found
                break
    if not phone:
        for line in lines:
            header, inline_value = _header_value(line)
            if header in CONTACT_HEADERS:
                phone = _extract_phone_from_line(inline_value or line) or phone
            elif not phone:
                phone = _extract_phone_from_line(line)
    if not work_authorization:
        for line in lines:
            lower = line.lower()
            if any(
                token in lower
                for token in ("citizen", "visa", "authorized to work", "work permit", "h1b", "gc")
            ):
                if _is_work_authorization_value(line):
                    work_authorization = line[:255]
                break
    if not summary and full_name:
        name_index = lines.index(full_name) if full_name in lines else -1
        if 0 <= name_index < len(lines) - 1:
            candidate = lines[name_index + 1]
            if not _is_section_header(candidate) and not PHONE_RE.search(candidate):
                summary = candidate[:2000]
    return CandidateProfileExtraction(
        full_name=full_name,
        phone=phone,
        location=location,
        summary=summary,
        years_experience=years_experience,
        skills=skills[:50],
        work_authorization=work_authorization,
    )


def apply_candidate_profile_update(
    profile: CandidateProfile | None,
    user: User,
    payload: CandidateProfileUpdate | CandidateProfileExtraction,
) -> CandidateProfile:
    profile = profile or CandidateProfile(user_id=user.id)
    profile.full_name = payload.full_name
    profile.phone = payload.phone
    profile.location = payload.location
    profile.summary = payload.summary
    profile.years_experience = payload.years_experience
    profile.skills = payload.skills
    profile.work_authorization = payload.work_authorization
    return profile


def apply_job_preference_update(
    preference: JobPreference | None,
    user: User,
    payload: JobPreferenceUpdate,
) -> JobPreference:
    preference = preference or JobPreference(user_id=user.id)
    preference.desired_titles = payload.desired_titles
    preference.preferred_locations = payload.preferred_locations
    preference.remote_preference = payload.remote_preference
    preference.employment_types = payload.employment_types
    preference.required_excluded_technologies = payload.required_excluded_technologies
    preference.preferred_excluded_technologies = payload.preferred_excluded_technologies
    preference.salary_min = payload.salary_min
    preference.salary_currency = payload.salary_currency
    return preference
