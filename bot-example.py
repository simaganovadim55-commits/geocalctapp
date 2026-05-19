"""
GeoCalculator — Telegram Bot
════════════════════════════════════════════════════════════

Минимальный бот, который:
  1. Открывает Web App кнопкой в меню / инлайн-кнопкой
  2. Принимает результаты расчётов от Web App через web_app_data

Установка:
  pip install python-telegram-bot

Запуск:
  BOT_TOKEN=<ваш токен> python bot-example.py
  или просто вставьте токен ниже.

Деплой Web App:
  Загрузите geo-webapp/ на GitHub Pages (репозиторий → Settings → Pages)
  URL будет: https://<ваш-логин>.github.io/<репо>/
  Впишите его в WEB_APP_URL ниже.
"""

import os
import json
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, MenuButtonWebApp
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

logging.basicConfig(level=logging.INFO)

BOT_TOKEN  = os.getenv("BOT_TOKEN", "8944337740:AAGMAcUzqDhpGLA2eI3ZufkaPvQ1C_ZTMqc")
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://simaganovadim55-commits.github.io/geocalctapp/")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Команда /start — отправляет инлайн-кнопку с Web App."""
    keyboard = [[
        InlineKeyboardButton(
            text="🧮 Открыть GeoCalculator",
            web_app=WebAppInfo(url=WEB_APP_URL)
        )
    ]]
    await update.message.reply_text(
        "Геодезический калькулятор 📐\n\n"
        "Вычисляйте угловые невязки, нивелирные ходы, "
        "теодолитные ходы и координатные задачи прямо в Telegram.",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


async def set_menu_button(app: Application) -> None:
    """Установить кнопку меню (круглая кнопка в чате) → Web App."""
    await app.bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(text="GeoCalc", web_app=WebAppInfo(url=WEB_APP_URL))
    )


async def help_cmd(update: Update, _context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "📐 *GeoCalculator — разделы:*\n\n"
        "• *Угловые невязки* — СКП, Бессель, предельная погрешность\n"
        "• *Нивелирный ход* — невязка f\\_h, допуск, уравнивание\n"
        "• *Теодолитный ход* — f\\_β, f\\_s, координаты\n"
        "• *Ведомость координат* — замкнутый / разомкнутый ход\n"
        "• *Прямая задача* — X₂, Y₂ по α и d\n"
        "• *Обратная задача* — α и d по координатам\n"
        "• *Взвешенные* — средневзвешенное, μ, m\\_x̄\n"
        "• *Таблица Лапласа* — Φ(x) для нормального распределения\n\n"
        "Нажмите кнопку *GeoCalc* внизу чата, чтобы открыть.",
        parse_mode="Markdown"
    )


async def handle_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик данных из Web App.
    Вызывается когда пользователь нажимает MainButton («Отправить результат боту»).
    Данные приходят как JSON-строка в update.message.web_app_data.data.
    """
    raw = update.message.web_app_data.data
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        await update.message.reply_text(f"Получены данные: {raw}")
        return

    calc_type = data.get("type", "unknown")

    # Форматируем ответ по типу расчёта
    if calc_type == "angular_residuals":
        text = (
            f"📐 *Угловые невязки*\n"
            f"n = {data.get('n')} измерений\n"
            f"СКП m = {data.get('m')} {data.get('unit')}\n"
            f"Точность m_m = {data.get('mm')} {data.get('unit')}\n"
            f"Δ_пред = {data.get('dp')} {data.get('unit')}"
        )
    elif calc_type == "leveling":
        ok = "✅ НОРМА" if data.get("ok") else "❌ ПРЕВЫШЕН"
        text = (
            f"⊟ *Нивелирный ход*\n"
            f"Невязка f_h = {data.get('fh_mm')} мм\n"
            f"Допуск = ±{data.get('fdop_mm')} мм\n"
            f"Оценка: {ok}"
        )
    elif calc_type == "theodolite":
        text = (
            f"∠ *Теодолитный ход*\n"
            f"f_β = {data.get('fb_min')}′\n"
            f"f_s = {data.get('fs_m')} м\n"
            f"Точность 1:{data.get('rel')}"
        )
    elif calc_type == "weighted":
        text = (
            f"⚖ *Взвешенные измерения*\n"
            f"x̄ = {data.get('mean')}\n"
            f"μ = ±{data.get('mu')}\n"
            f"m_x̄ = ±{data.get('mx')}"
        )
    elif calc_type == "coordinate_schedule":
        ang_ok = "✅" if data.get("ang_ok") else "❌"
        lin_ok = "✅" if data.get("lin_ok") else "❌"
        coords = data.get("coords", [])
        coord_lines = "\n".join(f"  Т{i}: X={c['x']}, Y={c['y']}" for i, c in enumerate(coords))
        text = (
            f"⊞ *Ведомость координат*\n"
            f"Угловая невязка: {ang_ok} {data.get('fb_sec')}″\n"
            f"Линейная невязка: {lin_ok} f_s={data.get('fs_m')} м | 1:{data.get('rel')}\n"
            f"Координаты:\n{coord_lines}"
        )
    else:
        text = f"Результат расчёта:\n```\n{json.dumps(data, ensure_ascii=False, indent=2)}\n```"

    await update.message.reply_text(text, parse_mode="Markdown")


def main() -> None:
    app = Application.builder().token(BOT_TOKEN).post_init(set_menu_button).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))
    app.run_polling()



if __name__ == "__main__":
    main()
