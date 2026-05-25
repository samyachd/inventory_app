import asyncio
import datetime as dt
from datetime import datetime, timedelta, timezone

from core.logger import logger
from db.session import SessionLocal
from db.models import TokenBlacklist, OcrStat, Ordinateur, Ecran


async def purge_expired_tokens(interval_seconds: int = 3600) -> None:
    """Delete expired token blacklist rows once per hour."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            db = SessionLocal()
            try:
                deleted = (
                    db.query(TokenBlacklist)
                    .filter(TokenBlacklist.expire_at <= datetime.now(timezone.utc))
                    .delete()
                )
                db.commit()
                if deleted:
                    logger.info(f"Token blacklist: {deleted} expired entr{'y' if deleted == 1 else 'ies'} removed")
            finally:
                db.close()
        except Exception:
            logger.exception("Token blacklist cleanup failed")


async def prune_ocr_stats(retention_days: int = 90, interval_seconds: int = 86400 * 7) -> None:
    """Delete OCR stats older than retention_days (default 90). Runs weekly."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            db = SessionLocal()
            try:
                # OcrStat.timestamp is a naive datetime stored in UTC
                cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=retention_days)
                deleted = (
                    db.query(OcrStat)
                    .filter(OcrStat.timestamp < cutoff)
                    .delete()
                )
                db.commit()
                if deleted:
                    logger.info(f"OCR stats: {deleted} entr{'y' if deleted == 1 else 'ies'} older than {retention_days} days removed")
            finally:
                db.close()
        except Exception:
            logger.exception("OCR stats pruning failed")


async def check_warranty_expiry(warn_days: int = 30, interval_seconds: int = 86400) -> None:
    """Log warnings for equipment whose warranty expires within warn_days. Runs daily."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            db = SessionLocal()
            try:
                today = dt.date.today()
                horizon = today + timedelta(days=warn_days)

                expiring: list[tuple[str, object]] = []
                for model_cls, label in ((Ordinateur, "Ordinateur"), (Ecran, "Écran")):
                    rows = (
                        db.query(model_cls)
                        .filter(
                            model_cls.fin_garantie.isnot(None),
                            model_cls.fin_garantie >= today,
                            model_cls.fin_garantie <= horizon,
                        )
                        .all()
                    )
                    expiring.extend((label, r) for r in rows)

                if expiring:
                    logger.warning(
                        f"Warranty expiry: {len(expiring)} item(s) expire within {warn_days} days"
                    )
                    for label, item in expiring:
                        days_left = (item.fin_garantie - today).days
                        detail = f" service={item.service}" if item.service else ""
                        logger.warning(
                            f"  [{label}] tag={item.tag}  expires={item.fin_garantie} ({days_left}d){detail}"
                        )
                else:
                    logger.info(f"Warranty check: no equipment expiring within {warn_days} days")
            finally:
                db.close()
        except Exception:
            logger.exception("Warranty expiry check failed")
