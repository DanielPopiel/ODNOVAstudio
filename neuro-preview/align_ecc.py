import cv2, numpy as np

PNG = r"Fryzjer Demo Materialy\hf_20260730_222627_05bbfdc4-3c9c-40c8-99ed-9690829bf626.png"
MP4 = r"Fryzjer Demo Materialy\animacja.mp4"

img = cv2.imread(PNG)
cap = cv2.VideoCapture(MP4); ok, frame = cap.read(); cap.release()

best = None
for scale_factor, blur, motion, motname in [(0.5, 9, cv2.MOTION_EUCLIDEAN, "euklides"),
                                            (0.5, 9, cv2.MOTION_AFFINE, "affine"),
                                            (0.35, 7, cv2.MOTION_AFFINE, "affine-035")]:
    g1 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    g2 = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    g1 = cv2.GaussianBlur(g1, (blur, blur), 0)
    g2 = cv2.GaussianBlur(g2, (blur, blur), 0)
    g1 = cv2.resize(g1, None, fx=scale_factor, fy=scale_factor)
    g2 = cv2.resize(g2, None, fx=scale_factor, fy=scale_factor)
    s0, tx0, ty0 = 1.275439, 324.19, -2.37
    warp = np.float32([[s0, 0, tx0 * scale_factor], [0, s0, ty0 * scale_factor]])
    criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 500, 1e-8)
    try:
        cc, warp = cv2.findTransformECC(g1, g2, warp, motion, criteria, None, 5)
    except cv2.error as e:
        print(motname, "nie zbieglo")
        continue
    warp[:, 2] /= scale_factor
    print(motname, "cc=", round(float(cc), 5), "warp=", np.round(warp, 5).tolist())
    if best is None or cc > best[0]:
        best = (cc, warp)

if best is None:
    raise SystemExit("brak zbieznosci")
cc, warp = best
s = float(np.sqrt(warp[0,0]**2 + warp[0,1]**2))
tx, ty = float(warp[0,2]), float(warp[1,2])
print(f"\nBEST cc={cc:.5f} scale={s:.6f} tx={tx:.2f} ty={ty:.2f}")

warped = cv2.warpAffine(frame, warp, (img.shape[1], img.shape[0]))
mask = cv2.warpAffine(np.full(frame.shape[:2], 255, np.uint8), warp, (img.shape[1], img.shape[0])) > 0
blend = img.copy()
blend[mask] = (0.5 * img[mask] + 0.5 * warped[mask]).astype(np.uint8)
cv2.imwrite(r"neuro-preview\align_check2.png", blend)
print("saved blend")
