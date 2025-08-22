import logging
import os

def get_logger(name: str) -> logging.Logger:
    """
    Creates and returns a logger with the given name.
    - Ensures 'logs/' folder exists
    - Creates a log file named after the module/file calling it
    - Logs both to file and console
    """

    # Ensure logs folder exists
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)

    # Log file name: logs/<name>.log
    log_file = os.path.join(log_dir, f"{name}.log")

    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)  # capture all logs

    # Avoid adding multiple handlers if logger is reused
    if not logger.handlers:
        # File handler
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)

        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        # Add handlers
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger