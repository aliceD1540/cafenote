import { MODERATION_RULES } from "./moderation-rules";

export interface ModerationResult {
	allowed: boolean;
	level: number;
	warning?: string;
}

export async function moderateContent(message: string, geminiApiKey?: string, geminiModel: string = "gemini-1.5-flash"): Promise<ModerationResult> {
	if (!geminiApiKey) {
		// APIキーが設定されていない場合は投稿を拒否
		console.error("Gemini API key is not configured");
		return { allowed: false, level: 0, warning: "コンテンツモデレーション機能が利用できません。管理者に連絡してください。" };
	}

	const prompt = MODERATION_RULES.replace("{TEXT_TO_CHECK}", message);

	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{
									text: prompt,
								},
							],
						},
					],
					generationConfig: {
						temperature: 0,
						maxOutputTokens: 10,
					},
				}),
			}
		);

		if (!response.ok) {
			console.error("Gemini API error:", await response.text());
			return { allowed: false, level: 0, warning: "コンテンツモデレーションに失敗しました。しばらくしてから再度お試しください。" };
		}

		const data = await response.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
		const level = parseInt(text, 10);

		if (!text || isNaN(level)) {
			console.error("Invalid moderation response:", text);
			return { allowed: false, level: 0, warning: "コンテンツモデレーションに失敗しました。しばらくしてから再度お試しください。" };
		}

		if (level === 1) {
			return { allowed: true, level: 1 };
		} else if (level === 2) {
			return { allowed: true, level: 2, warning: "軽度の不適切表現が検出されましたが、投稿は許可されます。" };
		} else if (level === 3) {
			return { allowed: false, level: 3, warning: "不適切な内容が検出されたため、投稿できません。" };
		}

		// 予期しないレベル値の場合も拒否
		console.error("Unexpected moderation level:", level);
		return { allowed: false, level: 0, warning: "コンテンツモデレーションに失敗しました。しばらくしてから再度お試しください。" };
	} catch (error) {
		console.error("Moderation error:", error);
		return { allowed: false, level: 0, warning: "コンテンツモデレーションに失敗しました。しばらくしてから再度お試しください。" };
	}
}
