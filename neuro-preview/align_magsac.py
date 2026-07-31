import cv2, numpy as np

PNG = r"Fryzjer Demo Materialy\hf_20260730_222627_05bbfdc4-3c9c-40c8-99ed-9690829bf626.png"
MP4 = r"Fryzjer Demo Materialy\animacja.mp4"

img = cv2.imread(PNG)
cap = cv2.VideoCapture(MP4); ok, frame = cap.read(); cap.release()
g1 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
g2 = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

sift = cv2.SIFT_create(nfeatures=20000, contrastThreshold=0.008, edgeThreshold=16)
k1, d1 = sift.detectAndCompute(g1, None)
k2, d2 = sift.detectAndCompute(g2, None)
print("keypoints:", len(k1), len(k2))
bf = cv2.BFMatcher()
matches = bf.knnMatch(d2, d1, k=2)
good = [m for m, n in matches if m.distance < 0.8 * n.distance]
src = np.float32([k2[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
dst = np.float32([k1[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=20000, confidence=0.999)
inl = inl.ravel().astype(bool)
# druga runda: dopasowanie LSQ na inlierach (wykorzystuje wszystkie punkty, nie tylko minimalny zestaw)
src_in, dst_in = src[inl, 0], dst[inl, 0]
M2, _ = cv2.estimateAffinePartial2D(src_in, dst_in, method=cv2.LMEDS)
if M2 is not None:
    M = M2
err = np.linalg.norm((src[inl, 0] @ M[:, :2].T + M[:, 2]) - dst[inl, 0], axis=1)
print(f"good={len(good)} inliers={inl.sum()} RMSE={np.sqrt((err**2).mean()):.3f}px median={np.median(err):.3f}px max={err.max():.2f}px")
s = float(np.sqrt(M[0,0]**2 + M[0,1]**2))
tx, ty = float(M[0,2]), float(M[1,2])
print(f"scale={s:.6f} tx={tx:.3f} ty={ty:.3f}")

warped = cv2.warpAffine(frame, M, (img.shape[1], img.shape[0]))
mask = cv2.warpAffine(np.full(frame.shape[:2], 255, np.uint8), M, (img.shape[1], img.shape[0])) > 0
blend = img.copy()
blend[mask] = (0.5 * img[mask] + 0.5 * warped[mask]).astype(np.uint8)
cv2.imwrite(r"neuro-preview\align_check2.png", blend)
# szachownica do oceny
tile = 172
check = img.copy()
check[mask] = 0
h, w = img.shape[:2]
for y in range(0, h, tile):
    for x in range(0, w, tile):
        if ((x // tile) + (y // tile)) % 2 == 0:
            check[y:y+tile, x:x+tile][mask[y:y+tile, x:x+tile]] = warped[y:y+tile, x:x+tile][mask[y:y+tile, x:x+tile]]
cv2.imwrite(r"neuro-preview\align_checkboard.png", check)
print("saved blends")
