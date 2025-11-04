import logging
from app.core.config import config


def setup_logging():
    """
    Configure logging based on DEBUG setting.
    - If DEBUG is True: Show INFO level and above (INFO, WARNING, ERROR, CRITICAL)
    - If DEBUG is False: Show ERROR level and above only (ERROR, CRITICAL)
    """
    log_level = logging.INFO if config.debug else logging.ERROR
    
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s"
    )
    
    # Log the current log level for transparency
    logger = logging.getLogger(__name__)
    if config.debug:
        logger.info(f"Logging initialized in DEBUG mode (level: {logging.getLevelName(log_level)})")
    else:
        logger.error(f"Logging initialized in PRODUCTION mode (level: {logging.getLevelName(log_level)})")