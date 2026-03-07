"""Утилиты для CoolCare API."""
from fastapi import Depends, HTTPException
import auth


def check_admin(current_user: dict = Depends(auth.get_current_user)):
    """Проверка прав администратора."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def calculate_job_total(job: dict) -> float:
    """Расчет общей стоимости заявки: либо основная цена, либо сумма услуг."""
    price = float(job.get("price") or 0)
    if price > 0:
        return price

    services = job.get("services") or []
    total = 0.0
    for s in services:
        if isinstance(s, dict):
            p = float(s.get("price") or 0)
            q = float(s.get("quantity") or 1)
            total += p * q
    return total


def auto_calc_services_price(data: dict) -> dict:
    """Автопересчёт цены из услуг, если есть services."""
    services = data.get("services") or []
    if services:
        total = sum(
            float(s.get("price") or 0) * float(s.get("quantity") or 1)
            for s in services if isinstance(s, dict)
        )
        if total > 0:
            data["price"] = total
    return data
