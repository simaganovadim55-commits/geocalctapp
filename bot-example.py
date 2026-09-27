"""
GeoCalculator — Telegram Bot
════════════════════════════════════════════════════════════

Минимальный бот, который:
  1. Открывает Web App кнопкой клавиатуры / кнопкой меню
  2. Принимает результаты расчётов от Web App через web_app_data

Важно: Telegram передаёт данные из Web App боту (tg.sendData) ТОЛЬКО если
Web App открыт кнопкой обычной клавиатуры (KeyboardButton). Из кнопки меню
или инлайн-кнопки калькулятор работает, но кнопка «Отправить результат» скрыта.

Установка:
  pip install python-telegram-bot

Запуск:
  export BOT_TOKEN=<токен от @BotFather>
  export WEB_APP_URL=https://<ваш-логин>.github.io/<репо>/   # необязательно
  python bot-example.py

Токен НЕ хранится в коде: никогда не коммитьте его в репозиторий.

Деплой Web App:
  Опубликуйте репозиторий на GitHub Pages (Settings → Pages),
  URL будет: https://<ваш-логин>.github.io/<репо>/
"""

import os
import sys
import json
import logging
from html import escape
from telegram import (
    Update, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo, MenuButtonWebApp,
)
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

logging.basicConfig(level=logging.INFO)

BOT_TOKEN   = os.getenv("BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://simaganovadim55-commits.github.io/geocalctapp/")


def web_app_keyboard() -> ReplyKeyboardMarkup:
    """Клавиатура с кнопкой Web App — только так работает отправка результатов боту."""
    return ReplyKeyboardMarkup(
        [[KeyboardButton(text="🧮 Открыть GeoCalculator", web_app=WebAppInfo(url=WEB_APP_URL))]],
        resize_keyboard=True,
    )


async def start(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    """Команда /start — показывает клавиатуру с кнопкой Web App."""
    await update.message.reply_text(
        "Геодезический калькулятор 📐\n\n"
        "Вычисляйте угловые невязки, нивелирные ходы, "
        "теодолитные ходы и координатные задачи прямо в Telegram.\n\n"
        "Откройте калькулятор кнопкой внизу — тогда результат расчёта "
        "можно отправить сюда в чат.",
        reply_markup=web_app_keyboard(),
    )


async def set_menu_button(app: Application) -> None:
    """Установить кнопку меню (слева от поля ввода) → Web App."""
    await app.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="GeoCalc", web_app=WebAppInfo(url=WEB_APP_URL))
    )


async def help_cmd(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "📐 <b>GeoCalculator — разделы:</b>\n\n"
        "• <b>Угловые невязки</b> — СКП, Бессель, предельная погрешность\n"
        "• <b>Нивелирный ход</b> — невязка f_h, допуск, уравнивание\n"
        "• <b>Теодолитный ход</b> — f_β, f_s, координаты\n"
        "• <b>Ведомость координат</b> — замкнутый / разомкнутый ход\n"
        "• <b>Прямая задача</b> — X₂, Y₂ по α и d\n"
        "• <b>Обратная задача</b> — α и d по координатам\n"
        "• <b>Взвешенные</b> — средневзвешенное, μ, m_x̄\n"
        "• <b>Таблица Лапласа</b> — Φ(x) для нормального распределения\n\n"
        "Откройте калькулятор кнопкой внизу чата (если её нет — /start).",
        parse_mode=ParseMode.HTML,
        reply_markup=web_app_keyboard(),
    )


def v(data: dict, key: str) -> str:
    """Значение из данных Web App, экранированное для HTML; None → «—»."""
    val = data.get(key)
    return "—" if val is None else escape(str(val))


def mark(flag) -> str:
    return "—" if flag is None else ("✅" if flag else "❌")


def rel(data: dict) -> str:
    return "1:∞" if data.get("rel") is None else f"1:{v(data, 'rel')}"


def format_result(data: dict) -> str:
    calc_type = data.get("type")

    if calc_type == "angular_residuals":
        u = v(data, "unit")
        return (
            "📐 <b>Угловые невязки</b>\n"
            f"n = {v(data, 'n')} измерений\n"
            f"СКП m = ±{v(data, 'm')} {u}\n"
            f"Точность m_m = ±{v(data, 'mm')} {u}\n"
            f"Δ_пред = ±{v(data, 'dp')} {u}"
        )
    if calc_type == "leveling":
        return (
            "⊟ <b>Нивелирный ход</b>\n"
            f"Невязка f_h = {v(data, 'fh_mm')} мм\n"
            f"Допуск = ±{v(data, 'fdop_mm')} мм\n"
            f"Оценка: {'✅ НОРМА' if data.get('ok') else '❌ ПРЕВЫШЕН'}"
        )
    if calc_type == "theodolite":
        return (
            "∠ <b>Теодолитный ход</b>\n"
            f"{mark(data.get('ang_ok'))} f_β = {v(data, 'fb_min')}′\n"
            f"{mark(data.get('lin_ok'))} f_s = {v(data, 'fs_m')} м | {rel(data)}"
        )
    if calc_type == "weighted":
        return (
            "⚖ <b>Взвешенные измерения</b>\n"
            f"x̄ = {v(data, 'mean')}\n"
            f"μ = ±{v(data, 'mu')}\n"
            f"m_x̄ = ±{v(data, 'mx')}"
        )
    if calc_type == "coordinate_schedule":
        coords = data.get("coords") or []
        coord_lines = "\n".join(
            f"  {'Н' if i == 0 else i}: X={escape(str(c.get('x')))}, Y={escape(str(c.get('y')))}"
            for i, c in enumerate(coords)
        )
        ang = (
            f"{mark(data.get('ang_ok'))} {v(data, 'fb_sec')}″"
            if data.get("ang_ok") is not None else "не выполнялась (α_кон не задан)"
        )
        lin = (
            f"{mark(data.get('lin_ok'))} f_s={v(data, 'fs_m')} м | {rel(data)}"
            if data.get("lin_ok") is not None else "не выполнялась (X, Y кон не заданы)"
        )
        return (
            "⊞ <b>Ведомость координат</b>\n"
            f"Угловая невязка: {ang}\n"
            f"Линейная невязка: {lin}\n"
            f"Координаты:\n<pre>{coord_lines}</pre>"
        )
    return f"Результат расчёта:\n<pre>{escape(json.dumps(data, ensure_ascii=False, indent=2))}</pre>"


async def handle_web_app_data(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик данных из Web App.
    Вызывается когда пользователь нажимает MainButton («Отправить результат боту»).
    Данные приходят как JSON-строка в update.message.web_app_data.data.
    """
    raw = update.message.web_app_data.data
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("ожидался JSON-объект")
    except ValueError:
        await update.message.reply_text(f"Получены данные: {raw}")
        return

    await update.message.reply_text(format_result(data), parse_mode=ParseMode.HTML)


def main() -> None:
    if not BOT_TOKEN:
        sys.exit("Не задан BOT_TOKEN. Пример: export BOT_TOKEN=<токен от @BotFather>")
    app = Application.builder().token(BOT_TOKEN).post_init(set_menu_button).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))
    app.run_polling()


if __name__ == "__main__":
    main()
