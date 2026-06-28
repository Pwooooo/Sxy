-- SXY Gamepass Verification Script
-- Place this in ServerScriptService in Roblox Studio

local HttpService = game:GetService("HttpService")
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local API_BASE = "https://getsxy.vercel.app"

local GAMEPASS_IDS = {
	1890222051, -- Basic (R$2000)
	1893671635, -- Premium (R$4400)
}

local function checkOwnership(userId, gamepassId)
	local success, owns = pcall(function()
		return MarketplaceService:UserOwnsGamePassAsync(userId, gamepassId)
	end)
	if success then
		return owns
	end
	return false
end

local function reportOwnership(userId, gamepassId)
	local success, err = pcall(function()
		HttpService:PostAsync(
			API_BASE .. "/api/ownership-callback",
			HttpService:JSONEncode({
				userId = tostring(userId),
				gamepassId = tostring(gamepassId),
			}),
			Enum.HttpContentType.ApplicationJson
		)
	end)
	if not success then
		warn("[SXY] Failed to report ownership for user " .. userId .. ": " .. tostring(err))
	end
end

local function onPlayerAdded(player)
	task.spawn(function()
		task.wait(3)

		for _, gamepassId in ipairs(GAMEPASS_IDS) do
			if checkOwnership(player.UserId, gamepassId) then
				reportOwnership(player.UserId, gamepassId)
			end
		end
	end)
end

Players.PlayerAdded:Connect(onPlayerAdded)

for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(onPlayerAdded, player)
end
