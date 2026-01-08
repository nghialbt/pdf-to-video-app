from moviepy.editor import ImageClip, concatenate_videoclips, CompositeVideoClip
import os
import random
import PIL.Image

# Monkeypatch for MoviePy compatibility with Pillow 10+
if not hasattr(PIL.Image, 'ANTIALIAS'):
    PIL.Image.ANTIALIAS = PIL.Image.Resampling.LANCZOS


def create_video_from_images(image_paths, output_video_path, duration_per_image, transition="none", transition_duration=1.0, logger="bar"):
    """
    Creates a video from a list of image paths with optional transitions.
    Transitions: 'none', 'crossfade'
    """
    clips = [ImageClip(m).set_duration(duration_per_image) for m in image_paths]
    import random

    w, h = clips[0].size
    
    def apply_zoom(clip):
        # Scale from 1.0 to 1.15 for better visibility
        return clip.resize(lambda t: 1.0 + 0.15 * t / clip.duration)

    def apply_slide(clip, direction, duration):
        # Use lambda t with smooth movement.
        # t is time relative to clip's start.
        if direction == "left":
            # Slide in from Right to Left
            return clip.set_position(lambda t: (max(0, int(w * (1 - t/duration))), 0) if t < duration else (0, 0))
        elif direction == "right":
            # Slide in from Left to Right
            return clip.set_position(lambda t: (min(0, int(-w * (1 - t/duration))), 0) if t < duration else (0, 0))
        elif direction == "up":
            # Slide in from Bottom to Top
            return clip.set_position(lambda t: (0, max(0, int(h * (1 - t/duration)))) if t < duration else (0, 0))
        elif direction == "down":
            # Slide in from Top to Bottom
            return clip.set_position(lambda t: (0, min(0, int(-h * (1 - t/duration)))) if t < duration else (0, 0))
        return clip

    available_transitions = ["crossfade", "slide_left", "slide_right", "slide_up", "slide_down", "zoom_in", "fadeinout"]
    
    final_clips = []
    
    for i, clip in enumerate(clips):
        # 1. Determine transition for THIS clip
        if isinstance(transition, list):
            current_transition = random.choice(transition)
        elif transition == "random":
            current_transition = random.choice(available_transitions)
        else:
            current_transition = transition
            
        # 2. Determine if we need an overlap for this transition
        # Slide and Crossfade require overlapping the previous clip
        is_overlapping = current_transition.startswith("slide") or current_transition == "crossfade"
        overlap_for_this_clip = transition_duration if (i > 0 and is_overlapping) else 0
        
        # 3. Set clip duration: 
        # It needs to stay active for its display time PLUS its transition out time (which is the NEXT clip's overlap)
        # However, it's easier to think about it as: each clip starts at i * duration_per_image
        # and lasts for duration_per_image + (transition_duration if there's a following transition).
        # To be safe, we'll just set it to duration_per_image + transition_duration for all but maybe the last.
        clip = clip.set_duration(duration_per_image + transition_duration)

        # 4. Apply 'continuous' type effects (like zoom)
        if current_transition == "zoom_in":
            clip = apply_zoom(clip)
            
        # 5. Apply 'entrance' type effects (transitions)
        if i > 0:
            if current_transition.startswith("slide"):
                direction = current_transition.split("_")[1]
                clip = apply_slide(clip, direction, transition_duration)
            elif current_transition == "crossfade":
                clip = clip.crossfadein(transition_duration)
            elif current_transition == "fadeinout":
                clip = clip.fadein(0.5).fadeout(0.5)
        else:
            # First clip
            if current_transition == "fadeinout" or current_transition == "crossfade":
                clip = clip.fadein(0.5)
        
        # 6. Set precise timing
        # Each slide "starts" (becomes active/visible alone or starts transition) at intervals of duration_per_image
        start_at = i * duration_per_image
        
        # If it's an overlapping transition, we actually want THIS clip to have started 
        # transition_duration EARLIER than the "clean" start time? No.
        # If Slide 1 is 0-5s. 
        # Slide 2 should start its entrance animation at 5s.
        # So Slide 1 must still be visible from 5s to 6s.
        # Thus Slide 1 duration is 6s. Slide 2 starts at 5s.
        
        clip = clip.set_start(start_at)
        final_clips.append(clip)

    # Calculate total duration
    total_duration = len(clips) * duration_per_image
    # If the last clip has a transition duration tail, we might want to include it or cut it.
    # Usually users expect SlideDuration * ImageCount.
    
    # Create the composite clip
    final_clip = CompositeVideoClip(final_clips, size=(w, h)).set_duration(total_duration)
    
    # Write the video file
    # Write the video file
    # threads=1 to reduce memory usage
    final_clip.write_videofile(output_video_path, fps=24, codec='libx264', audio=False, threads=1, logger=logger)
    
    # Close clips to free memory
    final_clip.close()
    for clip in clips:
        clip.close()
    
    return output_video_path
