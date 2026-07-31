import cv2, numpy as np

PNG = r"Fryzjer Demo Materialy\hf_20260730_222627_05bbfdc4-3c9c-40c8-99ed-9690829bf626.png"
MP4 = r"Fryzjer Demo Materialy\animacja.mp4"

img = cv2.imread(PNG)
cap = cv2.VideoCapture(MP4)
ok, frame = cap.read()
cap.release()
assert ok and img is not None
print("png", img.shape[1], img.shape[0], "| vid", frame.shape[1], frame.shape[0])

g1 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
g2 = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

sift = cv2.SIFT_create(nfeatures=4000)
k1, d1 = sift.detectAndCompute(g1, None)
k2, d2 = sift.detectAndCompute(g2, None)
bf = cv2.BFMatcher()
matches = bf.knnMatch(d2, d1, k=2)  # video -> png
good = [m for m, n in matches if m.distance < 0.75 * n.distance]
print("good matches:", len(good))

src = np.float32([k2[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
dst = np.float32([k1[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
M, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=4)
print("inliers:", int(inliers.sum()), "/", len(good))
s = float(np.sqrt(M[0,0]**2 + M[0,1]**2))
tx, ty = float(M[0,2]), float(M[1,2])
print(f"scale={s:.6f} tx={tx:.2f} ty={ty:.2f}")
# wymiary wideo w pikselach PNG po mapowaniu
print("vid rect w png-px: x", tx, "..", tx + s*frame.shape[1], " y", ty, "..", ty + s*frame.shape[0])
