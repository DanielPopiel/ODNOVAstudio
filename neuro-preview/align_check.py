import cv2, numpy as np

PNG = r"Fryzjer Demo Materialy\hf_20260730_222627_05bbfdc4-3c9c-40c8-99ed-9690829bf626.png"
MP4 = r"Fryzjer Demo Materialy\animacja.mp4"
s, tx, ty = 1.275439, 324.19, -2.37

img = cv2.imread(PNG)
cap = cv2.VideoCapture(MP4); ok, frame = cap.read(); cap.release()
M = np.float32([[s, 0, tx], [0, s, ty]])
warped = cv2.warpAffine(frame, M, (img.shape[1], img.shape[0]))
mask = cv2.warpAffine(np.full(frame.shape[:2], 255, np.uint8), M, (img.shape[1], img.shape[0])) > 0
blend = img.copy()
blend[mask] = (0.5 * img[mask] + 0.5 * warped[mask]).astype(np.uint8)
cv2.imwrite(r"neuro-preview\align_check.png", blend)
print("saved")
