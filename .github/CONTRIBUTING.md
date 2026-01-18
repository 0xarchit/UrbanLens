# Contributing to UrbanLens

Thank you for your interest in contributing to UrbanLens! We welcome contributions from the community to help make city infrastructure autonomous and self-healing.

## 🛠️ Tech Stack & Prerequisites

Before you start, ensure you have the following installed:
*   **Backend**: Python 3.10+, FastAPI, PostgreSQL (PostGIS)
*   **Web**: Node.js 18+, Next.js 16
*   **Mobile**: React Native, Expo
*   **Infra**: Docker, Supabase CLI

## 📂 Project Structure

Please familiarize yourself with the "Modular Monolith" structure before submitting a PR:
*   `Backend/agents/`: Autonomous logic (Vision, Geo, Priority, etc.). **Do not mix business logic here.**
*   `Backend/api/`: Stateless Routes.
*   `User/`: Citizen App code.
*   `Frontend/`: Admin & Worker Dashboards.

## 🚀 How to Contribute

1.  **Fork the Repository**: Click the "Fork" button on the top right.
2.  **Clone your Fork**: `git clone https://github.com/YOUR_USERNAME/UrbanLens.git`
3.  **Create a Branch**: `git checkout -b feature/amazing-feature`
4.  **Make Changes**: Write your code and tests.
5.  **Commit**: `git commit -m "feat: Add amazing feature"` (Use [Conventional Commits](https://www.conventionalcommits.org/))
6.  **Push**: `git push origin feature/amazing-feature`
7.  **Open a Pull Request**: Submit a PR to the `main` branch.

## 🧪 Testing

*   **Backend**: Run `pytest` in `Backend/`
*   **Frontend**: Run `npm run test` or build check `npm run build`

## 🎨 Coding Standards

*   **Python**: Follow PEP 8. Use `black` and `isort`.
*   **TypeScript**: Use ESLint and Prettier.

## ⚖️ License

By contributing, you agree that your contributions will be licensed under its MIT License.
